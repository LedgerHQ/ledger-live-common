import { flow, isArray, isEqual, isObject } from "lodash/fp";
import { isUndefined, mapValues, omitBy } from "lodash/fp";
import { cached, ChainAPI, Config, getChainAPI, logged, queued } from "../api";
import { makeBridges } from "./bridge";
import { makeLRUCache } from "../../../cache";
import { getMockedMethods } from "./mock-data";
import { minutes } from "../api/cached";

function getMockedAPI(config: Config): Promise<ChainAPI> {
  const mockedMethods = getMockedMethods();
  const api = new Proxy(
    { config },
    {
      get(_, propKey) {
        if (propKey in api) {
          return api[propKey];
        }
        if (propKey === "then") {
          return undefined;
        }
        const method = propKey.toString();
        const mocks = mockedMethods.filter((mock) => mock.method === method);
        if (mocks.length === 0) {
          throw new Error(`no mock found for api method: ${method}`);
        }
        return function (...args: any[]) {
          const definedArgs = removeUndefineds(args);
          const mock = mocks.find(({ params }) => isEqual(definedArgs)(params));
          if (mock === undefined) {
            const argsJson = JSON.stringify(args);
            throw new Error(
              `no mock found for api method ${method} with args ${argsJson}`
            );
          }
          return Promise.resolve(mock.answer);
        };
      },
    }
  );
  return Promise.resolve(api as ChainAPI);
}

function removeUndefineds(input: any) {
  return isObject(input)
    ? isArray(input)
      ? input.map(removeUndefineds)
      : flow(omitBy(isUndefined), mapValues(removeUndefineds))(input)
    : input;
}

/* eslint-disable @typescript-eslint/no-unused-vars */
const createMockForApi = makeLRUCache(
  (config: Config) =>
    Promise.resolve(
      cached(queued(logged(getChainAPI(config), "/tmp/log"), 100))
      //queued(logged(getChainAPI(config), "/tmp/log"), 100)
    ),
  (config) => config.cluster,
  minutes(1000)
);

//export default makeBridges(createMockForApi);
export default makeBridges(getMockedAPI);
