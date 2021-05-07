// @flow
import invariant from "invariant";
import { BigNumber } from "bignumber.js";
import union from "lodash/union";
import throttle from "lodash/throttle";
import flatMap from "lodash/flatMap";
import eip55 from "eip55";
import { log } from "@ledgerhq/logs";
import { mergeOps } from "../../bridge/jsHelpers";
import type { GetAccountShape } from "../../bridge/jsHelpers";
import {
  encodeTokenAccountId,
  decodeTokenAccountId,
  areAllOperationsLoaded,
  inferSubOperations,
  emptyHistoryCache,
} from "../../account";
import {
  findTokenByAddress,
  listTokensForCryptoCurrency,
} from "../../currencies";
import { encodeOperationId } from "../../operation";
import type { Operation, TokenAccount, Account } from "../../types";
import api from "./api/tzkt";
import type { APIOperation } from "./api/tzkt";

export const getAccountShape: GetAccountShape = async (infoInput) => {
  let { currency, address, initialAccount } = infoInput;

  const initialStableOperations = initialAccount
    ? initialAccount.operations // TODO stableOperations like eth
    : [];

  // fetch transactions, incrementally if possible
  const mostRecentStableOperation = initialStableOperations[0];

  const apiAccountPromise = api.getAccountByAddress(address);
  const blocksCountPromise = api.getBlockCount();

  const [apiAccount, blockHeight] = await Promise.all([
    apiAccountPromise,
    blocksCountPromise,
  ]);

  if (apiAccount.type === "empty") {
    return {
      blockHeight,
      lastSyncDate: new Date(),
    };
  }
  invariant(
    apiAccount.type === "user",
    "unsupported account of type ",
    apiAccount.type
  );

  console.log(apiAccount);

  // TODO paginate with lastId

  const apiOperations = await fetchAllTransactions(address);

  const { revealed } = apiAccount;

  const tezosResources = {
    revealed,
  };

  const balance = BigNumber(apiAccount.balance);
  const subAccounts = [];

  const newOps = apiOperations.map(txToOp(infoInput)).filter(Boolean);

  const operations = mergeOps(initialStableOperations, newOps);

  const accountShape: $Shape<Account> = {
    operations,
    balance,
    subAccounts,
    spendableBalance: balance,
    blockHeight,
    lastSyncDate: new Date(),
    tezosResources,
  };

  return accountShape;
};

const txToOp = ({ address, id }) => (tx: APIOperation): ?Operation => {
  if (tx.type !== "transaction") {
    console.log(tx);
    return;
  }
  const {
    hash,
    amount,
    gasUsed,
    storageUsed,
    sender,
    target,
    level,
    block,
    timestamp,
    status,
  } = tx;
  console.log(tx);
  const fee = BigNumber(gasUsed).plus(storageUsed);
  const value = BigNumber(amount); // TODO + gas?
  const blockHeight = level;
  const blockHash = block;
  const type = sender.address === address ? "OUT" : "IN";
  return {
    id: encodeOperationId(id, hash, type),
    hash,
    type,
    value,
    fee,
    senders: [sender.address],
    recipients: [target.address],
    blockHeight,
    blockHash,
    accountId: id,
    date: new Date(timestamp),
    extra: {},
    hasFailed: status === "applied",
  };
};

const fetchAllTransactions = async (
  address: string,
  lastId?: string
): Promise<APIOperation[]> => {
  let r;
  let txs = [];
  let maxIteration = 20; // safe limit
  do {
    r = await api.getAccountOperations(address, { lastId });
    if (r.length === 0) return txs;
    txs = txs.concat(r);
    lastId = txs[txs.length - 1].id;
    if (!lastId) {
      log("tezos", "id missing!");
      return txs;
    }
  } while (--maxIteration);
  return txs;
};

// TODO share it with ETH!
// reconciliate the existing token accounts so that refs don't change if no changes is contained
function reconciliateSubAccounts(tokenAccounts, initialAccount) {
  let subAccounts;
  if (initialAccount) {
    const initialSubAccounts = initialAccount.subAccounts;
    let anySubAccountHaveChanged = false;
    const stats = [];
    if (
      initialSubAccounts &&
      tokenAccounts.length !== initialSubAccounts.length
    ) {
      stats.push("length differ");
      anySubAccountHaveChanged = true;
    }
    subAccounts = tokenAccounts.map((ta) => {
      const existing = initialSubAccounts?.find((a) => a.id === ta.id);
      if (existing) {
        let shallowEqual = true;
        if (existing !== ta) {
          for (let k in existing) {
            if (existing[k] !== ta[k]) {
              shallowEqual = false;
              stats.push(`field ${k} changed for ${ta.id}`);
              break;
            }
          }
        }
        if (shallowEqual) {
          return existing;
        } else {
          anySubAccountHaveChanged = true;
        }
      } else {
        anySubAccountHaveChanged = true;
        stats.push(`new token account ${ta.id}`);
      }
      return ta;
    });
    if (!anySubAccountHaveChanged && initialSubAccounts) {
      log(
        "ethereum",
        "incremental sync: " +
          String(initialSubAccounts.length) +
          " sub accounts have not changed"
      );
      subAccounts = initialSubAccounts;
    } else {
      log(
        "ethereum",
        "incremental sync: sub accounts changed: " + stats.join(", ")
      );
    }
  } else {
    subAccounts = tokenAccounts.map((a) => a);
  }
  return subAccounts;
}
