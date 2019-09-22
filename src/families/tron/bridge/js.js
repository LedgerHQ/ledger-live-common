// @flow
import { throwError } from "rxjs";
import { BigNumber } from "bignumber.js";
import flatMap from "lodash/flatMap";
import get from "lodash/get";
import bs58check from "bs58check";
import type { Operation } from "../../../types";
import type { Transaction } from "../types";
import type { CurrencyBridge, AccountBridge } from "../../../types/bridge";
import { inferDeprecatedMethods } from "../../../bridge/deprecationUtils";
import network from "../../../network";
import {
  makeStartSync,
  makeScanAccountsOnDevice
} from "../../../bridge/jsHelpers";

const b58 = hex => bs58check.encode(Buffer.from(hex, "hex"));

const txToOps = ({ id, address }) => (tx: Object): Operation[] => {
  const ops = [];
  const hash = tx.txID;
  const date = new Date(tx.block_timestamp);
  get(tx, "raw_data.contract", []).forEach(contract => {
    if (contract.type === "TransferContract") {
      const { amount, owner_address, to_address } = get(
        contract,
        "parameter.value",
        {}
      );
      if (amount && owner_address && to_address) {
        const value = BigNumber(amount);
        const from = b58(owner_address);
        const to = b58(to_address);
        const sending = address === from;
        const receiving = address === to;
        const fee = BigNumber(0);
        if (sending) {
          ops.push({
            id: `${id}-${hash}-OUT`,
            hash,
            type: "OUT",
            value: value.plus(fee),
            fee,
            blockHeight: 0,
            blockHash: null,
            accountId: id,
            senders: [from],
            recipients: [to],
            date,
            extra: {}
          });
        }
        if (receiving) {
          ops.push({
            id: `${id}-${hash}-IN`,
            hash,
            type: "IN",
            value,
            fee,
            blockHeight: 0,
            blockHash: null,
            accountId: id,
            senders: [from],
            recipients: [to],
            date,
            extra: {}
          });
        }
      }
    }
  });
  return ops;
};

async function fetchTronAccount(addr: string) {
  const { data } = await network({
    method: "GET",
    url: `https://api.trongrid.io/v1/accounts/${addr}`
  });
  return data.data;
}

async function fetchTronAccountOps(
  addr: string,
  makeOps: (Array<any>) => Operation[],
  shouldFetchMoreOps: (Operation[]) => boolean
) {
  let payload = await network({
    method: "GET",
    url: `https://api.trongrid.io/v1/accounts/${addr}/transactions`
  });
  let fetchedTxs = payload.data.data;
  let ops = [];
  while (fetchedTxs && Array.isArray(fetchedTxs) && shouldFetchMoreOps(ops)) {
    ops = ops.concat(makeOps(fetchedTxs));
    const next = get(payload.data, "meta.links.next");
    if (!next) return ops;
    payload = await network({
      method: "GET",
      url: next
    });
    fetchedTxs = payload.data.data;
  }
  return ops;
}

const getAccountShape = async info => {
  const tronAcc = await fetchTronAccount(info.address);
  if (tronAcc.length === 0) {
    return { balance: BigNumber(0) };
  }
  const operations = await fetchTronAccountOps(
    info.address,
    txs => flatMap(txs, txToOps(info)),
    ops => ops.length < 200
  );
  return {
    balance: BigNumber(tronAcc[0].balance),
    operations
  };
};

const scanAccountsOnDevice = makeScanAccountsOnDevice(getAccountShape);

const startSync = makeStartSync(getAccountShape);

const currencyBridge: CurrencyBridge = {
  scanAccountsOnDevice
};

const createTransaction = () => ({
  family: "tron",
  amount: BigNumber(0),
  recipient: ""
});

const getTransactionStatus = () =>
  Promise.reject(new Error("signAndBroadcast not supported"));

const signAndBroadcast = () =>
  throwError(new Error("signAndBroadcast not supported"));

const prepareTransaction = async (a, t: Transaction): Promise<Transaction> =>
  Promise.resolve(t);

const getCapabilities = () => ({
  canSync: true,
  canSend: false
});

const accountBridge: AccountBridge<Transaction> = {
  createTransaction,
  prepareTransaction,
  getTransactionStatus,
  startSync,
  signAndBroadcast,
  getCapabilities,
  ...inferDeprecatedMethods({
    name: "TronJSBridge",
    createTransaction,
    getTransactionStatus,
    prepareTransaction
  })
};

export default { currencyBridge, accountBridge };
