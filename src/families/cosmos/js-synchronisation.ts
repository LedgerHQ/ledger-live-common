import { Account, Operation } from "../../types";
import { BigNumber } from "bignumber.js";
import { makeSync, GetAccountShape, mergeOps } from "../../bridge/jsHelpers";
import { encodeAccountId } from "../../account";
import { getAccountInfo } from "./api/Cosmos";
import { encodeOperationId } from "../../operation";

const txToOps = (info: any, id: string, txs: any): Operation[] => {
  const { address, currency } = info;
  const ops: Operation[] = [];

  for (const tx of txs) {
    let fees = new BigNumber(0);

    tx.tx.auth_info.fee.amount.forEach((elem) => {
      fees = fees.plus(elem.amount);
    });

    const op: Operation = {
      id: "",
      hash: tx.txhash,
      type: "" as any,
      value: new BigNumber(0),
      fee: fees,
      blockHash: null,
      blockHeight: tx.height,
      senders: [] as any,
      recipients: [] as any,
      accountId: id,
      date: new Date(tx.timestamp),
      extra: {
        validators: [] as any,
      },
    };

    tx.logs[0].events.forEach((message) => {
      // parse attributes as key:value
      const attributes: { [id: string]: any } = {};
      message.attributes.forEach((item) => (attributes[item.key] = item.value));

      // https://docs.cosmos.network/v0.42/modules/staking/07_events.html
      switch (message.type) {
        case "transfer":
          op.senders.push(attributes["sender"]);
          op.recipients.push(attributes["recipient"]);

          op.value = op.value.plus(
            attributes["amount"].replace(currency.units[1].code, "")
          );

          if (attributes["sender"] === address) {
            op.type = "OUT";
            op.value = op.value.plus(fees);
          } else if (attributes["recipient"] === address) {
            op.type = "IN";
          }
          break;

        case "withdraw_rewards":
          op.type = "REWARD";
          op.value = new BigNumber(fees);
          op.extra.validators.push({
            amount: attributes["amount"].replace(currency.units[1].code, ""),
            address: attributes.validator,
          });
          break;

        case "delegate":
          op.type = "DELEGATE";
          op.value = new BigNumber(fees);
          op.extra.validators.push({
            amount: attributes["amount"].replace(currency.units[1].code, ""),
            address: attributes.validator,
          });
          break;

        case "redelegate":
          op.type = "REDELEGATE";
          op.value = new BigNumber(fees);
          op.extra.validators.push({
            amount: attributes["amount"].replace(currency.units[1].code, ""),
            address: attributes.destination_validator,
          });
          op.extra.cosmosSourceValidator = attributes.source_validator;
          break;

        case "unbond":
          op.type = "UNDELEGATE";
          op.value = new BigNumber(fees);
          op.extra.validators.push({
            amount: attributes["amount"].replace(currency.units[1].code, ""),
            address: attributes.validator,
          });
          break;
      }
    });

    op.id = encodeOperationId(id, tx.txhash, op.type);

    if (op.type) {
      ops.push(op);
    }
  }

  return ops;
};

const postSync = (initial: Account, parent: Account) => parent;

export const getAccountShape: GetAccountShape = async (info) => {
  const { address, currency, derivationMode, initialAccount } = info;

  const accountId = encodeAccountId({
    type: "js",
    version: "2",
    currencyId: currency.id,
    xpubOrAddress: address,
    derivationMode,
  });

  const { balances, blockHeight, txs, delegations, withdrawAddress } =
    await getAccountInfo(address);

  const oldOperations = initialAccount?.operations || [];
  const newOperations = txToOps(info, accountId, txs);
  const operations = mergeOps(oldOperations, newOperations);

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
