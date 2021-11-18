import type { Account } from "../../types";
import type { Command, Transaction } from "./types";
import {
  addSignatureToTransaction,
  buildTransferTransaction,
  buildTokenTransferTransaction,
  buildCreateAssociatedTokenAccountTransaction,
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
  const { commandDescriptor } = tx.model;
  if (commandDescriptor === undefined) {
    throw new Error("missing command descriptor");
  }
  switch (commandDescriptor.status) {
    case "valid":
      return buildForCommand(commandDescriptor.command);
    case "invalid":
      throw new Error("can not build invalid command");
    default:
      return assertUnreachable(commandDescriptor);
  }
}

async function buildForCommand(command: Command): Promise<OnChainTransaction> {
  switch (command.kind) {
    case "transfer":
      return buildTransferTransaction(command);
    case "token.transfer":
      return buildTokenTransferTransaction(command);
    case "token.createATA":
      return buildCreateAssociatedTokenAccountTransaction(command);
    default:
      return assertUnreachable(command);
  }
}
