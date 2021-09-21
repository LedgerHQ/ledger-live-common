import { log } from "@ledgerhq/logs";
import { AxiosRequestConfig, AxiosResponse } from "axios";
import { LedgerAPINotAvailable } from "@ledgerhq/errors";

import {
  BalanceResponse,
  BroadcastTransactionRequest,
  BroadcastTransactionResponse,
  EstimatedFeesRequest,
  EstimatedFeesResponse,
  NetworkStatusResponse,
  TransactionResponse,
  TransactionsResponse,
} from "./types";
import network from "../../../../network";
import { blockchainBaseURL } from "../../../../api/Ledger";
import { getCryptoCurrencyById } from "../../../../currencies";
import { getEnv } from "../../../../env";

const root = "http://127.0.0.1:8888/blockchain/filecoin";

const getFilecoinURL = (path?: string): string => {
  if (getEnv("DEVELOPMENT_MODE")) return root + (path ? path : "");

  const currency = getCryptoCurrencyById("filecoin");
  const baseURL = blockchainBaseURL(currency);

  if (!baseURL) {
    throw new LedgerAPINotAvailable(`LedgerAPINotAvailable ${currency.id}`, {
      currencyName: currency.name,
    });
  }

  return baseURL + (path ? path : "");
};

const fetch = async <T>(path: string) => {
  const url = getFilecoinURL(path);

  // We force data to this way as network func is not using the correct param type. Changing that func will generate errors in other implementations
  const opts: AxiosRequestConfig = {
    method: "GET",
    url,
  };
  const rawResponse = await network(opts);

  // We force data to this way as network func is not using the correct param type. Changing that func will generate errors in other implementations
  const { data } = rawResponse as AxiosResponse<T>;

  log("http", url);
  return data;
};

const send = async <T>(path: string, data: Record<string, any>) => {
  const url = getFilecoinURL(path);

  const opts: AxiosRequestConfig = {
    method: "POST",
    url,
    data: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  };

  const rawResponse = await network(opts);

  // We force data to this way as network func is not using generics. Changing that func will generate errors in other implementations
  const { data: responseData } = rawResponse as AxiosResponse<T>;

  log("http", url);
  return responseData;
};

export const fetchBalances = async (addr: string): Promise<BalanceResponse> => {
  const data = await fetch<BalanceResponse>(`/addresses/${addr}/balance`);
  return data; // TODO Validate if the response fits this interface
};

export const fetchEstimatedFees = async (
  request: EstimatedFeesRequest
): Promise<EstimatedFeesResponse> => {
  const data = await send<EstimatedFeesResponse>(`/fees/estimate`, request);
  return data; // TODO Validate if the response fits this interface
};

export const fetchBlockHeight = async (): Promise<NetworkStatusResponse> => {
  const data = await fetch<NetworkStatusResponse>("/network/status");
  return data as NetworkStatusResponse; // TODO Validate if the response fits this interface
};

export const fetchTxs = async (
  addr: string
): Promise<TransactionResponse[]> => {
  const response = await fetch<TransactionsResponse>(
    `/addresses/${addr}/transactions`
  );
  return response.txs; // TODO Validate if the response fits this interface
};

export const broadcastTx = async (
  message: BroadcastTransactionRequest
): Promise<BroadcastTransactionResponse> => {
  const response = await send<BroadcastTransactionResponse>(
    `/transaction/broadcast`,
    message
  );
  return response; // TODO Validate if the response fits this interface
};
