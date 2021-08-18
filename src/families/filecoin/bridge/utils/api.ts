import {
  BalanceResponse,
  NetworkStatusResponse,
  TransactionResponse,
} from "./types";
import network from "../../../../network";
import { log } from "@ledgerhq/logs";

const root = "http://127.0.0.1:8888/blockchain/filecoin";

const fetch = async (path) => {
  const url = root + path;
  const { data } = await network({
    method: "GET",
    url,
  });
  log("http", url);
  return data;
};

export const fetchBalances = async (addr: string): Promise<BalanceResponse> => {
  const data = await fetch(`/addresses/${addr}/balance`);
  return data as BalanceResponse; // FIXME Validate if the response fits this interface
};

export const fetchBlockHeight = async (): Promise<NetworkStatusResponse> => {
  const data = await fetch("/network/status");
  return data as NetworkStatusResponse; // FIXME Validate if the response fits this interface
};

export const fetchTxs = async (
  addr: string
): Promise<TransactionResponse[]> => {
  const response = await fetch(`/addresses/${addr}/transactions`);
  return response.txs as TransactionResponse[]; // FIXME Validate if the response fits this interface
};
