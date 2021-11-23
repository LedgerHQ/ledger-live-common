import { BigNumber } from "bignumber.js";
import type { Account } from "../../types";
import type { Command, Transaction } from "./types";
import { assertUnreachable } from "./utils";

const getTransactionStatus = async (
  _: Account,
  tx: Transaction
): Promise<Status> => {
  const txFees = new BigNumber(tx.feeCalculator?.lamportsPerSignature ?? 0);

  const { commandDescriptor } = tx.model;

  if (commandDescriptor === undefined) {
    return {
      amount: new BigNumber(tx.amount),
      errors: {},
      warnings: {},
      estimatedFees: txFees,
      totalSpent: new BigNumber(tx.amount),
    };
  }
  switch (commandDescriptor.status) {
    case "invalid":
      return {
        amount: new BigNumber(tx.amount),
        errors: commandDescriptor.errors,
        warnings: commandDescriptor.warnings ?? {},
        estimatedFees: txFees,
        totalSpent: new BigNumber(0),
      };
    case "valid": {
      const { command } = commandDescriptor;
      const estimatedFees = txFees.plus(commandDescriptor.fees ?? 0);
      const amount = getAmount(tx, command);
      const totalSpent = getTotalSpent(command, amount, estimatedFees);

      return {
        amount,
        estimatedFees,
        totalSpent,
        warnings: commandDescriptor.warnings ?? {},
        errors: {},
      };
    }
    default:
      return assertUnreachable(commandDescriptor);
  }
};

type Status = {
  errors: Record<string, Error>;
  warnings: Record<string, Error>;
  estimatedFees: BigNumber;
  amount: BigNumber;
  totalSpent: BigNumber;
};

function getAmount(tx: Transaction, command: Command) {
  switch (command.kind) {
    case "transfer":
    case "token.transfer":
      return new BigNumber(command.amount);
    default:
      return tx.amount;
  }
}

function getTotalSpent(
  command: Command,
  amount: BigNumber,
  estimatedFees: BigNumber
) {
  switch (command.kind) {
    case "transfer":
      return amount.plus(estimatedFees);
    case "token.transfer":
      return amount;
    case "token.createATA":
      return estimatedFees;
    default:
      return assertUnreachable(command);
  }
}

export default getTransactionStatus;
