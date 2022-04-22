import { LedgerAPI4xx, LedgerAPI5xx, NetworkDown } from "@ledgerhq/errors";
import { log } from "@ledgerhq/logs";
import got, {
  CancelableRequest,
  Options,
  OptionsOfJSONResponseBody,
  RequestError,
  Response,
} from "got-cjs";
import invariant from "invariant";
import ResponseLike from "responselike";
import { getEnv } from "./env";

type Promisable<T> = T | Promise<T>;
type Metadata = { startTime: number };

export const requestInterceptor = (
  options: Options
): Promisable<void | Response | ResponseLike> => {
  const { prefixUrl, url, method = "", json } = options;
  log("network", `${method} ${prefixUrl || ""}${url}`, { json });

  // // $FlowFixMe (LLD side)
  // const req: ExtendedOptions = options;

  options.context = {
    startTime: Date.now(),
  };
};

export const responseInterceptor = (
  response: Response
): Promisable<Response | CancelableRequest<Response>> => {
  const { prefixUrl, url, method = "", context } = response.request.options;
  const { startTime = 0 } = (context || {}) as Metadata;

  log(
    "network-success",
    `${response.statusCode} ${method} ${prefixUrl || ""}${url} (${(
      Date.now() - startTime
    ).toFixed(0)}ms)`,
    getEnv("DEBUG_HTTP_RESPONSE") ? { body: response.body } : undefined
  );

  return response;
};

export const errorInterceptor = (
  error: RequestError
): Promisable<RequestError> => {
  const options = error.request?.options;
  if (!options) throw error;
  const { prefixUrl, url, method = "", context } = options;
  const { startTime = 0 } = (context || {}) as Metadata;

  let errorToThrow;
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    const { body, statusCode } = error.response;
    let msg;
    try {
      if (body && typeof body === "string") {
        msg = extractErrorMessage(body);
      } else if (body && typeof body === "object") {
        msg = getErrorMessage(body);
      }
    } catch (e) {
      log("warn", "can't parse server result " + String(e));
    }

    if (msg) {
      errorToThrow = makeError(msg, statusCode, url, method);
    } else {
      errorToThrow = makeError(
        `API HTTP ${statusCode}`,
        statusCode,
        url,
        method
      );
    }
    log(
      "network-error",
      `${statusCode} ${method} ${prefixUrl || ""}${url} (${(
        Date.now() - startTime
      ).toFixed(0)}ms): ${errorToThrow.message}`,
      getEnv("DEBUG_HTTP_RESPONSE") ? { body } : {}
    );
    throw errorToThrow;
  } else if (error.request) {
    log(
      "network-down",
      `DOWN ${method} ${prefixUrl || ""}${url} (${(
        Date.now() - startTime
      ).toFixed(0)}ms)`
    );
    throw new NetworkDown();
  }
  throw error;
};

const makeError = (msg, status, url, method) => {
  const obj = {
    status,
    url,
    method,
  };
  return (status || "").toString().startsWith("4")
    ? new LedgerAPI4xx(msg, obj)
    : new LedgerAPI5xx(msg, obj);
};

const getErrorMessage = (
  data: Record<string, any>
): string | null | undefined => {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (data.errors) {
    return getErrorMessage(data.errors[0]);
  }
  return data.message || data.error_message || data.error || data.msg;
};

const extractErrorMessage = (raw: string): string | undefined => {
  let data = JSON.parse(raw);
  if (data && Array.isArray(data)) data = data[0];
  let msg = getErrorMessage(data);

  if (typeof msg === "string") {
    const m = msg.match(/^JsDefined\((.*)\)$/);
    const innerPart = m ? m[1] : msg;

    const r = JSON.parse(innerPart);
    let message = r.message;
    if (typeof message === "object") {
      message = message.message;
    }
    if (typeof message === "string") {
      msg = message;
    }

    return msg ? String(msg) : undefined;
  }

  return;
};

export interface NetworkResponse<T = any> extends Response<T> {
  /**
  The mapping of the reponse body on data.
  */
  data: T;

  statusCode: number;
}

type Except<ObjectType, KeysType extends keyof ObjectType> = Pick<
  ObjectType,
  Exclude<keyof ObjectType, KeysType>
>;
type Merge<FirstType, SecondType> = Except<
  FirstType,
  Extract<keyof FirstType, keyof SecondType>
> &
  SecondType;
export type NetworkOptions = Merge<
  OptionsOfJSONResponseBody,
  {
    data?: any;
  }
>;

const implementation = (
  arg: NetworkOptions
): CancelableRequest<NetworkResponse<any>> => {
  invariant(typeof arg === "object", "network takes an object as parameter");

  const options: NetworkOptions = {
    timeout: {
      request: getEnv("GET_CALLS_TIMEOUT"),
    },
    retry: {
      limit: getEnv("GET_CALLS_RETRY"),
      methods: ["get"],
    },
    hooks: {
      beforeRequest: [requestInterceptor],
      afterResponse: [responseInterceptor],
      beforeError: [errorInterceptor],
    },
    headers: {
      "content-type": "application/json",
    },
    json: arg.data,
    ...arg,
  };

  delete options.data;

  return got(options as OptionsOfJSONResponseBody)
    .json()
    .then((response: any) => ({
      ...response,
      data: response.body,
      statusCode: response.status,
    })) as CancelableRequest<NetworkResponse<any>>;
};

export default implementation;
