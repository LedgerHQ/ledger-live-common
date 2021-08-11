// @flow
import URL from "url";
import invariant from "invariant";
import { BigNumber } from "bignumber.js";
import { LedgerAPINotAvailable } from "@ledgerhq/errors";
import JSONBigNumber from "../JSONBigNumber";
import type { CryptoCurrency, Account } from "../types";
import type { Transaction } from "../families/platon/types";
import network from "../network";
// import { blockchainBaseURL } from "./Ledger";
import { FeeEstimationFailed } from "../errors";
import { makeLRUCache } from "../cache";

export type Block = { height: BigNumber }; // TODO more fields actually

export type Tx = {
  txHash: string,
  txReceiptStatus?: BigNumber, // 0: fail, 1: success
  timestamp?: number,
  blockHash?: string,
  value: BigNumber,
  actualTxCost: BigNumber,
  from: string,
  to: string,
  blockNumber: number,
};

export type ERC20BalancesInput = Array<{
  address: string,
  contract: string,
}>;

export type ERC20BalanceOutput = Array<{
  address: string,
  contract: string,
  balance: BigNumber,
}>;

export type API = {
  getTransactions: (
    address: string,
    current?: number,
    batch_size?: number
  ) => Promise<{
    truncated: boolean,
    txs: Tx[],
  }>,
  getCurrentBlock: () => Promise<number>,
  getAccountNonce: (address: string) => Promise<number>,
  broadcastTransaction: (signedTransaction: string) => Promise<string>,
  getERC20Balances: (input: ERC20BalancesInput) => Promise<ERC20BalanceOutput>,
  getAccountBalance: (address: string) => Promise<BigNumber>,
  roughlyEstimateGasLimit: () => Promise<BigNumber>,
  getERC20ApprovalsPerContract: (
    owner: string,
    contract: string
  ) => Promise<Array<{ sender: string, value: string }>>,
  getDryRunGasLimit: (
    account: Account,
    transaction: Transaction
  ) => Promise<BigNumber>,
  getGasTrackerBarometer: () => Promise<BigNumber>,
};

export const apiForCurrency = (currency: CryptoCurrency): API => {
  const baseURL = "https://openapi.platon.network/rpc";
  const scanURL = "https://scan.platon.network";

  return {
    async getTransactions(address, pageNo, pageSize) {
      let { data } = await network({
        method: "POST",
        url: scanURL + "/browser-server/transaction/transactionListByAddress",
        data: { pageNo, pageSize, address },
      });
      data = {
        truncated: data.data.length >= pageSize,
        txs: data.data || [],
      };
      return data;
    },

    async getCurrentBlock() {
      const { data } = await network({
        method: "POST",
        url: baseURL,
        data: {
          jsonrpc: "2.0",
          method: "platon_blockNumber",
          params: [],
          id: 1,
        },
      });
      return data.result;
    },

    async getAccountNonce(address) {
      const { data } = await network({
        method: "POST",
        url: baseURL,
        data: {
          jsonrpc: "2.0",
          method: "platon_getTransactionCount",
          params: [address, "latest"],
          id: 1,
        },
      });
      return data.result;
    },

    async broadcastTransaction(tx) {
      const { data } = await network({
        method: "POST",
        url: baseURL,
        data: {
          jsonrpc: "2.0",
          method: "platon_sendRawTransaction",
          params: [tx],
          id: 1,
        },
      });
      return data.result;
    },

    async getAccountBalance(address) {
      const { data } = await network({
        method: "POST",
        url: baseURL,
        data: {
          jsonrpc: "2.0",
          method: "platon_getBalance",
          params: [address, "latest"],
          id: 1,
        },
        transformResponse: JSONBigNumber.parse,
      });
      return BigNumber(data.result);
    },

    async roughlyEstimateGasLimit() {
      const { data } = await network({
        method: "POST",
        url: baseURL,
        data: {
          jsonrpc: "2.0",
          method: "platon_estimateGas",
          params: [{}],
          id: 1,
        },
        transformResponse: JSONBigNumber.parse,
      });
      return BigNumber(data.result);
    },

    async getDryRunGasLimit(a, tx) {
      const { data } = await network({
        method: "POST",
        url: baseURL,
        data: {
          jsonrpc: "2.0",
          method: "platon_estimateGas",
          params: [
            {
              from: a.freshAddress,
              to: tx.recipient,
              data: tx.data,
            },
          ],
          id: 1,
        },
        transformResponse: JSONBigNumber.parse,
      });
      if (data.error && data.error.message) {
        throw new FeeEstimationFailed(data.error.message);
      }
      const value = BigNumber(data.result);
      invariant(!value.isNaN(), "invalid server data");
      return value;
    },

    getGasTrackerBarometer: makeLRUCache(
      async () => {
        // const { data } = await network({
        //   method: "POST",
        //   url: baseURL,
        //   data: {
        //     "jsonrpc":"2.0",
        //     "method":"platon_gasPrice",
        //     "params":[],
        //     "id":1
        //   }
        // });
        // return BigNumber(data.result);
        return {
          low: BigNumber("1000000000"),
          medium: BigNumber("10000000000"),
          high: BigNumber("30000000000"),
        };
      },
      () => "",
      { maxAge: 30 * 1000 }
    ),
  };
};
