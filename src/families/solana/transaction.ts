import { BigNumber } from "bignumber.js";
import type {
  Command,
  CommandDescriptor,
  CreateAssociatedTokenAccountCommand,
  TokenTransferCommand,
  Transaction,
  TransactionRaw,
  TransferCommand,
} from "./types";
import {
  fromTransactionCommonRaw,
  toTransactionCommonRaw,
} from "../../transaction/common";
import type { Account } from "../../types";
import { getAccountUnit } from "../../account";
import { formatCurrencyUnit } from "../../currencies";
import { assertUnreachable } from "./utils";

export const fromTransactionRaw = (tr: TransactionRaw): Transaction => {
  const common = fromTransactionCommonRaw(tr);
  const { family, state, feeCalculator } = tr;
  return {
    ...common,
    family,
    state: JSON.parse(state),
    feeCalculator,
  };
};

// TODO: not to serialize errors and warnings?
export const toTransactionRaw = (t: Transaction): TransactionRaw => {
  const common = toTransactionCommonRaw(t);
  const { family, state, feeCalculator } = t;
  return {
    ...common,
    family,
    state: JSON.stringify(state),
    feeCalculator,
  };
};

const lamportsToSOL = (account: Account, amount: number) => {
  return formatCurrencyUnit(getAccountUnit(account), new BigNumber(amount), {
    showCode: true,
    disableRounding: true,
  });
};

export const formatTransaction = (
  tx: Transaction,
  mainAccount: Account
): string => {
  switch (tx.state.kind) {
    case "prepared":
      switch (tx.state.commandDescriptor.status) {
        case "valid":
          return formatCommand(
            mainAccount,
            tx,
            tx.state.commandDescriptor.command
          );
        case "invalid":
          throw new Error("can not format invalid transaction");
        default:
          return assertUnreachable(tx.state.commandDescriptor);
      }
    case "unprepared":
      throw new Error("can not format unprepared transaction");
    default:
      return assertUnreachable(tx.state);
  }
};

function formatCommand(
  mainAccount: Account,
  tx: Transaction,
  command: Command
) {
  switch (command.kind) {
    case "transfer":
      return formatTransfer(mainAccount, tx, command);
    case "token.transfer":
      return formatTokenTransfer(mainAccount, tx, command);
    case "token.createAssociatedTokenAccount":
      return formatCreateATA(mainAccount, tx, command);
    default:
      return assertUnreachable(command);
  }
}

function formatTransfer(
  mainAccount: Account,
  tx: Transaction,
  command: TransferCommand
) {
  const amount = lamportsToSOL(mainAccount, command.amount);
  const str = [
    `  SEND: ${amount}${tx.useAllAmount ? " (ALL)" : ""}`,
    `  TO: ${command.recipient}`,
    command.memo ? `  MEMO: ${command.memo}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return "\n" + str;
}

function formatTokenTransfer(
  mainAccount: Account,
  tx: Transaction,
  command: TokenTransferCommand
) {
  return "not implemented yet";
}

function formatCreateATA(
  mainAccount: Account,
  tx: Transaction,
  command: CreateAssociatedTokenAccountCommand
) {
  return "not implemented yet";
}

export default {
  formatTransaction,
  fromTransactionRaw,
  toTransactionRaw,
};
