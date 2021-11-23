import type { Account } from "../../types";
import type { Command, Transaction } from "./types";
import {
  addSignatureToTransaction,
  buildTransferTransaction,
  buildTokenTransferTransaction,
  buildCreateAssociatedTokenAccountTransaction,
  Config,
} from "./api";
import { assertUnreachable } from "./utils";
import { Transaction as OnChainTransaction } from "@solana/web3.js";

export const buildOnChainTransaction = async (
  account: Account,
  transaction: Transaction,
  config: Config
): Promise<readonly [Buffer, (signature: Buffer) => Buffer]> => {
  const tx = await build(transaction, config);

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

function build(tx: Transaction, config: Config) {
  const { commandDescriptor } = tx.model;
  if (commandDescriptor === undefined) {
    throw new Error("missing command descriptor");
  }
  switch (commandDescriptor.status) {
    case "valid":
      return buildForCommand(commandDescriptor.command, config);
    case "invalid":
      throw new Error("can not build invalid command");
    default:
      return assertUnreachable(commandDescriptor);
  }
}

async function buildForCommand(
  command: Command,
  config: Config
): Promise<OnChainTransaction> {
  switch (command.kind) {
    case "transfer":
      return buildTransferTransaction(command, config);
    case "token.transfer":
      return buildTokenTransferTransaction(command, config);
    case "token.createATA":
      return buildCreateAssociatedTokenAccountTransaction(command, config);
    default:
      return assertUnreachable(command);
  }
}
