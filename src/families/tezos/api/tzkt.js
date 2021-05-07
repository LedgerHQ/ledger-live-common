// @flow
import URL from "url";
import network from "../../../network";

type APIAccount =
  | {
      type: "empty",
      address: string,
      counter: number,
    }
  | {
      type: "user",
      address: string,
      publicKey: string,
      revealed: boolean,
      balance: number,
      counter: number,
      delegate?: {
        alias: string,
        address: string,
        active: boolean,
      },
      delegationLevel: number,
      delegationTime: string,
      numTransactions: number,
      firstActivityTime: string,
    };

export type APIOperation = {
  type: "transaction",
  id: number,
  hash: string,
  amount: number,
  gasUsed: number,
  storageUsed: number,
  timestamp: string,
  sender: { address: string },
  target: { address: string },
  level: number,
  block: string,
  status: "applied" | "failed" | "backtracked" | "skipped",
};

const api = {
  async getBlockCount(): Promise<number> {
    const { data } = await network({
      method: "GET",
      url: `https://api.tzkt.io/v1/blocks/count`,
    });
    return data;
  },
  async getAccountByAddress(address: string): Promise<APIAccount> {
    const { data } = await network({
      method: "GET",
      url: `https://api.tzkt.io/v1/accounts/${address}`,
    });
    return data;
  },
  async getAccountOperations(
    address: string,
    query: {
      lastId?: string,
    }
  ): Promise<APIOperation[]> {
    const { data } = await network({
      method: "GET",
      url: URL.format({
        pathname: `https://api.tzkt.io/v1/accounts/${address}/operations`,
        query,
      }),
    });
    return data;
  },
};

export default api;
