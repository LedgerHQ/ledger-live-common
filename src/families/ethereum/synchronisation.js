// @flow
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
} from "../../account";
import { findTokenByAddress } from "../../currencies";
import type { Operation, TokenAccount, Account } from "../../types";
import { apiForCurrency } from "../../api/Ethereum";
import type { Tx } from "../../api/Ethereum";
import { digestTokenAccounts, prepareTokenAccounts } from "./modules";

export const getAccountShape: GetAccountShape = async (
  infoInput,
  { blacklistedTokenIds }
) => {
  let { currency, address, initialAccount } = infoInput;
  address = eip55.encode(address);
  const info = { ...infoInput, address };

  const api = apiForCurrency(currency);
  const initialStableOperations = initialAccount
    ? stableOperations(initialAccount)
    : [];

  // fetch transactions, incrementally if possible
  const mostRecentStableOperation = initialStableOperations[0];
  let pullFromBlockHash =
    initialAccount &&
    areAllOperationsLoaded(initialAccount) &&
    mostRecentStableOperation
      ? mostRecentStableOperation.blockHash
      : undefined;

  const [txs, currentBlock, balance] = await Promise.all([
    fetchAllTransactions(api, address, pullFromBlockHash),
    fetchCurrentBlock(currency),
    api.getAccountBalance(address),
  ]);

  const blockHeight = currentBlock.height.toNumber();

  if (!pullFromBlockHash && txs.length === 0) {
    log("ethereum", "no ops on " + address);
    return {
      balance,
      subAccounts: [],
      blockHeight,
    };
  }

  // transform transactions into operations
  let newOps = flatMap(txs, txToOps(info));

  // extracting out the sub operations by token account
  const perTokenAccountIdOperations = {};
  newOps.forEach((op) => {
    const { subOperations } = op;
    if (subOperations?.length) {
      subOperations.forEach((sop) => {
        if (!perTokenAccountIdOperations[sop.accountId]) {
          perTokenAccountIdOperations[sop.accountId] = [];
        }
        perTokenAccountIdOperations[sop.accountId].push(sop);
      });
    }
  });

  const subAccountsExisting = {};
  initialAccount?.subAccounts?.forEach((a) => {
    // in case of coming from libcore, we need to converge to new ids
    const { token } = decodeTokenAccountId(a.id);
    const id = encodeTokenAccountId(infoInput.id, token);
    subAccountsExisting[id] = a;
  });
  const subAccountsExistingIds = Object.keys(subAccountsExisting);
  const perTokenAccountChangedIds = Object.keys(perTokenAccountIdOperations);

  log(
    "ethereum",
    `${address} reconciliate ${txs.length} txs => ${newOps.length} new ops. ${perTokenAccountChangedIds.length} updates into ${subAccountsExistingIds.length} token accounts`
  );

  // reconciliate token accounts
  let tokenAccounts: TokenAccount[] = union(
    subAccountsExistingIds,
    perTokenAccountChangedIds
  )
    .map((id) => {
      const existing = subAccountsExisting[id];
      const newOps = perTokenAccountIdOperations[id];
      const { accountId, token } = decodeTokenAccountId(id);
      if (blacklistedTokenIds && blacklistedTokenIds.includes(token.id)) {
        return null;
      }
      if (existing && !newOps) return existing;
      const existingOps = existing?.operations || [];
      const operations = newOps ? mergeOps(existingOps, newOps) : existingOps;
      const lastOperation = operations[operations.length - 1];
      const creationDate =
        existing?.creationDate ||
        (lastOperation ? lastOperation.date : new Date());
      const pendingOperations = existing?.pendingOperations || [];
      const starred = existing?.starred || false;
      const swapHistory = existing?.swapHistory || [];
      return {
        type: "TokenAccount",
        id,
        token,
        parentId: accountId,
        balance: existing?.balance || BigNumber(0), // resolved in batched after this
        spendableBalance: existing?.balance || BigNumber(0), // resolved in batched after this
        creationDate,
        operationsCount: operations.length,
        operations,
        pendingOperations,
        starred,
        swapHistory,
      };
    })
    .filter(Boolean);

  tokenAccounts = await prepareTokenAccounts(currency, tokenAccounts, address);

  await loadERC20Balances(tokenAccounts, address, api);

  tokenAccounts = await digestTokenAccounts(currency, tokenAccounts, address);

  const subAccounts = reconciliateSubAccounts(tokenAccounts, initialAccount);

  // has sub accounts have changed, we need to relink the subOperations
  newOps = newOps.map((o) => ({
    ...o,
    subOperations: inferSubOperations(o.hash, subAccounts),
  }));

  const operations = mergeOps(initialStableOperations, newOps);

  const accountShape: $Shape<Account> = {
    operations,
    balance,
    subAccounts,
    spendableBalance: balance,
    blockHeight,
    lastSyncDate: new Date(),
    balanceHistory: undefined,
  };

  return accountShape;
};

const safeEncodeEIP55 = (addr) => {
  if (!addr || addr === "0x") return "";
  try {
    return eip55.encode(addr);
  } catch (e) {
    return "";
  }
};

// in case of a SELF send, 2 ops are returned.
const txToOps = ({ address, id }) => (tx: Tx): Operation[] => {
  // workaround bugs in our explorer that don't treat partial/optimistic operation really well
  if (!tx.gas_used) return [];

  const { hash, block, actions, transfer_events } = tx;
  const addr = address;
  const from = safeEncodeEIP55(tx.from);
  const to = safeEncodeEIP55(tx.to);
  const sending = addr === from;
  const receiving = addr === to;
  const value = BigNumber(tx.value);
  const fee = BigNumber(tx.gas_price).times(tx.gas_used || 0);
  const hasFailed = BigNumber(tx.status || 0).eq(0);
  const blockHeight = block && block.height.toNumber();
  const blockHash = block && block.hash;
  const date = tx.received_at ? new Date(tx.received_at) : new Date();
  const transactionSequenceNumber = parseInt(tx.nonce);

  // Internal transactions
  const internalOperations = !actions
    ? []
    : actions
        .map((action, i) => {
          const actionFrom = safeEncodeEIP55(action.from);
          const actionTo = safeEncodeEIP55(action.to);
          // Since explorer is considering also wrapping tx as an internal action,
          // we must filter it by considering that only internal action with same data,
          // sender and receiver, is the one representing/corresponding to wrapping tx
          if (
            actionFrom === from &&
            actionTo === to &&
            tx.value.eq(action.value)
          ) {
            return;
          }
          const receiving = addr === actionTo;
          const value = action.value;
          const fee = BigNumber(0);
          if (receiving) {
            return {
              id: `${id}-${hash}-i${i}`,
              hash,
              type: "IN",
              value,
              fee,
              blockHeight,
              blockHash,
              accountId: id,
              senders: [actionFrom],
              recipients: [actionTo],
              date,
              extra: {},
              transactionSequenceNumber,
            };
          }
        })
        .filter(Boolean);

  // We are putting the sub operations in place for now, but they will later be exploded out of the operations back to their token accounts
  const subOperations = !transfer_events
    ? []
    : flatMap(transfer_events.list, (event) => {
        const from = safeEncodeEIP55(event.from);
        const to = safeEncodeEIP55(event.to);
        const sending = addr === from;
        const receiving = addr === to;
        if (!sending && !receiving) {
          return [];
        }
        const token = findTokenByAddress(event.contract);
        if (!token) return [];
        const accountId = encodeTokenAccountId(id, token);
        const value = event.count;
        const all = [];
        if (sending) {
          const type = "OUT";
          all.push({
            id: `${accountId}-${hash}-${type}`,
            hash,
            type,
            value,
            fee,
            blockHeight,
            blockHash,
            accountId,
            senders: [from],
            recipients: [to],
            date,
            extra: {},
            transactionSequenceNumber,
          });
        }
        if (receiving) {
          const type = "IN";
          all.push({
            id: `${accountId}-${hash}-${type}`,
            hash,
            type,
            value,
            fee,
            blockHeight,
            blockHash,
            accountId,
            senders: [from],
            recipients: [to],
            date,
            extra: {},
            transactionSequenceNumber,
          });
        }
        return all;
      });

  const ops = [];

  if (sending) {
    const type = value.eq(0) && subOperations.length ? "FEES" : "OUT";
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
      internalOperations,
      subOperations,
      transactionSequenceNumber,
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
      internalOperations: sending ? [] : internalOperations, // if it was already in sending, we don't add twice
      subOperations: sending ? [] : subOperations,
      transactionSequenceNumber,
    });
  }

  if (
    !sending &&
    !receiving &&
    (internalOperations.length || subOperations.length)
  ) {
    ops.push({
      id: `${id}-${hash}-NONE`,
      hash: hash,
      type: "NONE",
      value: BigNumber(0),
      fee,
      blockHeight,
      blockHash,
      accountId: id,
      senders: [from],
      recipients: [to],
      date,
      extra: {},
      internalOperations,
      subOperations,
      transactionSequenceNumber,
    });
  }

  return ops;
};

const fetchCurrentBlock = ((perCurrencyId) => (currency) => {
  if (perCurrencyId[currency.id]) return perCurrencyId[currency.id]();
  const api = apiForCurrency(currency);
  const f = throttle(
    () =>
      api.getCurrentBlock().catch((e) => {
        f.cancel();
        throw e;
      }),
    5000
  );
  perCurrencyId[currency.id] = f;
  return f();
})({});

// FIXME we need to figure out how to optimize this
// but nothing can easily be done until we have a better api
const fetchAllTransactions = async (api, address, blockHash) => {
  let r;
  let txs = [];
  let maxIteration = 20; // safe limit
  do {
    r = await api.getTransactions(address, blockHash);
    if (r.txs.length === 0) return txs;
    txs = txs.concat(r.txs);
    blockHash = txs[txs.length - 1].block?.hash;
    if (!blockHash) {
      log("ethereum", "block.hash missing!");
      return txs;
    }
  } while (--maxIteration);
  return txs;
};

async function loadERC20Balances(tokenAccounts, address, api) {
  const erc20balances = await api.getERC20Balances(
    tokenAccounts.map(({ token }) => ({
      contract: token.contractAddress,
      address,
    }))
  );
  tokenAccounts.forEach((a) => {
    const r = erc20balances.find(
      (b) =>
        b.contract &&
        b.balance &&
        b.contract.toLowerCase() === a.token.contractAddress.toLowerCase()
    );
    // TODO: in case balance is not even found, the TokenAccount should be dropped because it likely means the token no longer is valid.
    if (r && !a.balance.eq(r.balance)) {
      a.balance = r.balance;
      a.spendableBalance = r.balance;
    }
  });
}

const SAFE_REORG_THRESHOLD = 80;
function stableOperations(a) {
  return a.operations.filter(
    (op) =>
      op.blockHeight && a.blockHeight - op.blockHeight > SAFE_REORG_THRESHOLD
  );
}

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
