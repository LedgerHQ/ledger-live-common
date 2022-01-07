import { Account, Operation } from "../../types";
import { BigNumber } from "bignumber.js";
import { makeSync, GetAccountShape } from "../../bridge/jsHelpers";
import { encodeAccountId } from "../../account";
import { getAccountInfo } from "./api/Cosmos";
import { encodeOperationId } from "../../operation";

const txToOps = (info: any, id: string, txs: any): any => {
  const { address } = info;
  const ops: Operation[] = [];

  for (const hash of Object.keys(txs)) {
    const txlog = JSON.parse(txs[hash].result.log);

    const op: Operation = {
      id: "",
      hash: hash,
      type: "" as any,
      value: new BigNumber(0),
      fee: txs[hash].fee,
      blockHash: null,
      blockHeight: txs[hash].height,
      senders: [] as any,
      recipients: [] as any,
      accountId: id,
      date: txs[hash].date,
      extra: {
        validators: [] as any,
      },
    };

    for (const t of txlog[0].events) {
      for (const a of t.attributes) {
        switch (a.key) {
          case "sender":
            op.senders.push(a.value);
            break;
          case "recipient":
            op.recipients.push(a.value);
            break;
          case "amount":
            if (op.value.eq(0)) {
              op.value = op.value.plus(a.value.replace("uatom", ""));
            }

            break;
          case "validator":
            op.extra.validators.push({ amount: op.value, address: a.value });
            break;
          case "new_shares":
            break;
        }
      }

      // todo: handle REDELEGATE and UNDELEGATE operations

      if (t.type === "delegate") {
        op.type = "DELEGATE";
        op.value = new BigNumber(txs[hash].fee);
      }

      if (t.type === "withdraw_rewards") {
        op.type = "REWARD";
        op.value = new BigNumber(txs[hash].fee);
      }
    }

    if (!op.type && address === op.senders[0]) {
      op.type = "OUT";
      op.value = op.value.plus(txs[hash].fee);
    }

    if (!op.type && address === op.recipients[0]) {
      op.type = "IN";
    }

    // remove duplicates
    op.recipients = op.recipients.filter((element, index) => {
      return op.recipients.indexOf(element) === index;
    });

    op.senders = op.senders.filter((element, index) => {
      return op.senders.indexOf(element) === index;
    });

    op.id = encodeOperationId(id, hash, op.type);

    if (op.type) {
      ops.push(op);
    }
  }

  return ops;
};

const postSync = (initial: Account, parent: Account) => parent;

export const getAccountShape: GetAccountShape = async (info) => {
  const { address, currency, derivationMode } = info;

  const accountId = encodeAccountId({
    type: "js",
    version: "2",
    currencyId: currency.id,
    xpubOrAddress: address,
    derivationMode,
  });

  const { balances, blockHeight, txs, delegations, withdrawAddress } =
    await getAccountInfo(address);
  const operations = txToOps(info, accountId, txs);
  let balance = balances;
  let delegatedBalance = new BigNumber(0);
  let pendingRewardsBalance = new BigNumber(0);
  let unbondingBalance = new BigNumber(0);

  for (const delegation of delegations) {
    delegatedBalance = delegatedBalance.plus(delegation.amount);
    balance = balance.plus(delegation.amount);

    pendingRewardsBalance = pendingRewardsBalance.plus(
      delegation.pendingRewards
    );

    if (delegation.status === "unbonding") {
      unbondingBalance = unbondingBalance.plus(delegation.amount);
    }
  }

  // todo: calculate estimatedFees
  const estimatedFees = new BigNumber(0);

  let spendableBalance = balance
    .minus(estimatedFees)
    .minus(unbondingBalance.plus(delegatedBalance));

  if (spendableBalance.lt(0)) {
    spendableBalance = new BigNumber(0);
  }

  const shape = {
    id: accountId,
    balance: balance,
    spendableBalance,
    operationsCount: operations.length,
    blockHeight,
    cosmosResources: {
      delegations,
      redelegations: [],
      unbondings: [],
      delegatedBalance,
      pendingRewardsBalance,
      unbondingBalance,
      withdrawAddress,
    },
  };

  if (shape.spendableBalance && shape.spendableBalance.lt(0)) {
    shape.spendableBalance = new BigNumber(0);
  }

  return { ...shape, operations };
};

export const sync = makeSync(getAccountShape, postSync);
