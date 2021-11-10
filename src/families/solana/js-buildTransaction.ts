import type { Account } from "../../types";
import type { Command, Transaction } from "./types";
import { addSignatureToTransaction, buildTransferTransaction } from "./api";
import { buildTokenTransferTransaction } from "./api/web3";
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
  switch (tx.commandDescriptor.status) {
    case "valid":
      return buildForCommand(tx.commandDescriptor.command);
    case "invalid":
      throw new Error("invalid command");
    default:
      return assertUnreachable(tx.commandDescriptor);
  }
}

async function buildForCommand(command: Command): Promise<OnChainTransaction> {
  switch (command.kind) {
    case "transfer":
      return buildTransferTransaction(command);
    case "token.transfer":
      return buildTokenTransferTransaction(command);
    default:
      return assertUnreachable(command);
  }
}

export default buildOnChainTransaction;
