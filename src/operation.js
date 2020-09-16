/**
 * @flow
 * @module account
 */

import { BigNumber } from "bignumber.js";
import type { Account, AccountLike, Operation } from "./types";

export function findOperationInAccount(
  { operations, pendingOperations }: AccountLike,
  operationId: string
): ?Operation {
  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    if (op.id === operationId) return op;
    if (op.internalOperations) {
      const internalOps = op.internalOperations;
      for (let j = 0; j < internalOps.length; j++) {
        const internalOp = internalOps[j];
        if (internalOp.id === operationId) return internalOp;
      }
    }
  }
  for (let i = 0; i < pendingOperations.length; i++) {
    const op = pendingOperations[i];
    if (op.id === operationId) return op;
  }
  return null;
}

export function patchOperationWithHash(
  operation: Operation,
  hash: string
): Operation {
  return {
    ...operation,
    hash,
    id: `${operation.accountId}-${hash}-${operation.type}`,
    subOperations:
      operation.subOperations &&
      operation.subOperations.map((op) => ({
        ...op,
        hash,
        id: `${op.accountId}-${hash}-${op.type}`,
      })),
  };
}

export function flattenOperationWithInternals(op: Operation): Operation[] {
  let ops = [];
  // ops of type NONE does not appear in lists
  if (op.type !== "NONE") {
    ops.push(op);
  }
  // all internal operations are expanded after the main op
  if (op.internalOperations) {
    ops = ops.concat(op.internalOperations);
  }
  return ops;
}

export function getOperationAmountNumber(op: Operation): BigNumber {
  switch (op.type) {
    case "IN":
    case "REWARD":
    case "SUPPLY":
      return op.value;
    case "OUT":
    case "REVEAL":
    case "CREATE":
    case "DELEGATE":
    case "REDELEGATE":
    case "UNDELEGATE":
    case "FEES":
    case "OPT_IN":
    case "OPT_OUT":
    case "REDEEM":
      return op.value.negated();
    case "FREEZE":
    case "UNFREEZE":
    case "VOTE":
      return op.fee.negated();
    default:
      return BigNumber(0);
  }
}

export function getOperationAmountNumberWithInternals(
  op: Operation
): BigNumber {
  return flattenOperationWithInternals(op).reduce(
    (amount: BigNumber, op) => amount.plus(getOperationAmountNumber(op)),
    BigNumber(0)
  );
}

export const getOperationConfirmationNumber = (
  operation: Operation,
  account: Account
): number =>
  operation.blockHeight ? account.blockHeight - operation.blockHeight + 1 : 0;

export const getOperationConfirmationDisplayableNumber = (
  operation: Operation,
  account: Account
): string =>
  account.blockHeight && operation.blockHeight && account.currency.blockAvgTime
    ? String(account.blockHeight - operation.blockHeight + 1)
    : "";
