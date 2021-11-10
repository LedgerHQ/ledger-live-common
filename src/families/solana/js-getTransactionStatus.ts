import { BigNumber } from "bignumber.js";
import type { Account } from "../../types";
import type { Command, Transaction } from "./types";

const getTransactionStatus = async (
  _: Account,
  tx: Transaction
): Promise<Status> => {
  const txFees = new BigNumber(tx.feeCalculator?.lamportsPerSignature ?? 0);
  if (tx.commandDescriptor.status === "invalid") {
    return {
      amount: new BigNumber(tx.amount),
      errors: tx.commandDescriptor.errors,
      warnings: tx.commandDescriptor.warnings ?? {},
      estimatedFees: txFees,
      totalSpent: new BigNumber(0),
    };
  }

  const commandDescriptor = tx.commandDescriptor;
  const command = commandDescriptor.command;
  const amount = getAmount(tx, command);
  const totalSpent = amount.plus(command.kind === "transfer" ? txFees : 0);
  const estimatedFees = txFees.plus(commandDescriptor.fees ?? 0);

  return {
    amount,
    estimatedFees,
    totalSpent,
    warnings: commandDescriptor.warnings ?? {},
    errors: {},
  };
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

export default getTransactionStatus;
