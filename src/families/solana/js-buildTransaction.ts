import type { Account } from "../../types";
import type {
  Command,
  CreateAssociatedTokenAccountCommand,
  Transaction,
} from "./types";
import {
  addSignatureToTransaction,
  buildTransferTransaction,
  buildTokenTransferTransaction,
  buildAssociatedTokenAccountTransaction,
} from "./api";
import { assertUnreachable } from "./utils";
import { Transaction as OnChainTransaction } from "@solana/web3.js";

/**
 * @param {Account} a
 * @param {Transaction} t
 */
export const buildOnChainTransaction = async (
  account: Account,
  transaction: Transaction
) => {
  const tx = await build(transaction);

  return [
    tx.compileMessage().serialize(),
    (signature: Buffer) => {
      return addSignatureToTransaction({
        tx,
        address: account.freshAddress,
        signature,
      }).serialize();
    },
  ] as const;
};

function build(tx: Transaction) {
  switch (tx.state.kind) {
    case "prepared":
      switch (tx.state.commandDescriptor.status) {
        case "valid":
          return buildForCommand(tx.state.commandDescriptor.command);
        case "invalid":
          throw new Error("invalid command");
        default:
          return assertUnreachable(tx.state.commandDescriptor);
      }
    case "unprepared":
      throw new Error("unprepared tx");
    default:
      return assertUnreachable(tx.state);
  }
}

async function buildForCommand(command: Command): Promise<OnChainTransaction> {
  switch (command.kind) {
    case "transfer":
      return buildTransferTransaction(command);
    case "token.transfer":
      return buildTokenTransferTransaction(command);
    case "token.createAssociatedTokenAccount":
      return buildAssociatedTokenAccountTransaction(command);
    default:
      return assertUnreachable(command);
  }
}
