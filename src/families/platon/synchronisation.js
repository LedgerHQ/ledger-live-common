// @flow
import { BigNumber } from "bignumber.js";
import union from "lodash/union";
import throttle from "lodash/throttle";
import flatMap from "lodash/flatMap";
import { log } from "@ledgerhq/logs";
import { mergeOps } from "../../bridge/jsHelpers";
import type { GetAccountShape } from "../../bridge/jsHelpers";
import { areAllOperationsLoaded } from "../../account";
import type { Operation, TokenAccount, Account } from "../../types";
import { apiForCurrency } from "../../api/Platon";
import type { Tx } from "../../api/Platon";

export const getAccountShape: GetAccountShape = async (infoInput) => {
  let { currency, address, initialAccount } = infoInput;
  const info = { ...infoInput };

  const api = apiForCurrency(currency);
  const oldOperations = initialAccount?.operations || [];

  // fetch transactions, incrementally if possible
  const mostRecentStableOperation = oldOperations[0];

  // when new tokens are added / blacklist changes, we need to sync again because we need to go through all operations again
  const syncBlockHeight = oldOperations[0]?.blockHeight || 0;

  const txsP = fetchAllTransactions(api, address, syncBlockHeight);
  const currentBlockP = api.getCurrentBlock();
  const balanceP = api.getAccountBalance(address);

  const [txs, blockHeight] = await Promise.all([txsP, currentBlockP]);

  // const blockHeight = currentBlock.height.toNumber();

  const balance = await balanceP;

  // transform transactions into operations
  const newOps = flatMap(txs, txToOps(info));

  const subAccounts = initialAccount?.subAccounts || [];

  const operations = mergeOps(oldOperations, newOps);

  const accountShape: $Shape<Account> = {
    operations,
    balance,
    subAccounts,
    spendableBalance: balance,
    blockHeight,
    lastSyncDate: new Date(),
    balanceHistory: undefined,
    syncHash: syncBlockHeight.toString(),
  };

  return accountShape;
};

// in case of a SELF send, 2 ops are returned.
const txToOps = ({ currency, address, id }) => (tx: Tx): Operation[] => {
  const { from, to, txHash, blockNumber, actualTxCost } = tx;
  const addr = address;
  const sending = addr === from;
  const receiving = addr === to;
  const hash = txHash;
  const magnitude = BigNumber(10).pow(currency.units[0].magnitude);
  const value = BigNumber(tx.value).times(magnitude);
  const fee = BigNumber(actualTxCost).times(magnitude);
  const hasFailed = BigNumber(tx.txReceiptStatus || 0).eq(0);
  const blockHeight = blockNumber;
  const blockHash = tx.blockHash || txHash;
  const date = tx.timestamp ? new Date(tx.timestamp) : new Date();

  const ops = [];

  if (sending) {
    const type = value.eq(0) ? "FEES" : "OUT";
    ops.push({
      id: `${id}-${hash}-${type}`,
      hash,
      type,
      value: hasFailed ? BigNumber(0) : value.plus(fee),
      fee,
      blockHeight,
      blockHash,
      accountId: id,
      senders: [from],
      recipients: [to],
      date,
      extra: {},
      hasFailed,
    });
  }

  if (receiving) {
    ops.push({
      id: `${id}-${hash}-IN`,
      hash: hash,
      type: "IN",
      value,
      fee,
      blockHeight,
      blockHash,
      accountId: id,
      senders: [from],
      recipients: [to],
      date: new Date(date.getTime() + 1), // hack: make the IN appear after the OUT in history.
      extra: {},
    });
  }

  return ops;
};

// FIXME we need to figure out how to optimize this
// but nothing can easily be done until we have a better api
const fetchAllTransactions = async (api, address, syncBlockHeight) => {
  let r;
  let txs = [];
  let maxIteration = 1; // safe limit
  const batch_size = 100; // safe limit
  do {
    const { txs: res } = await api.getTransactions(
      address,
      maxIteration,
      batch_size
    );
    txs = txs.concat(res);
    if (!res.length || res[res.length - 1].blockNumber < syncBlockHeight)
      return txs;
  } while (maxIteration++ < 20);
  return txs;
};
