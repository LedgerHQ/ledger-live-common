import { findSubAccountById } from "../../account";
import type { Account, TokenAccount } from "../../types";
import {
  getNetworkInfo,
  getOnChainTokenAccountsByMint,
  findAssociatedTokenAddress,
  getTokenTransferSpec,
} from "./api";

import type {
  AncillaryTokenAccountOperation,
  TokenTransferCommand,
  Transaction,
} from "./types";

const prepareTransaction = async (
  mainAccount: Account,
  tx: Transaction
): Promise<Transaction> => {
  const patch: Partial<Transaction> = {};

  if (tx.subAccountId) {
    if (tx.command.kind !== "token.transfer") {
      const subAccount = findSubAccountById(mainAccount, tx.subAccountId);
      if (!subAccount || subAccount.type !== "TokenAccount") {
        throw new Error("subaccount not found");
      }
      patch.command = await prepareTokenTransfer(mainAccount, subAccount, tx);
    }
  } else {
    // native sol transfer
    if (tx.command.kind !== "transfer") {
      patch.command = { kind: "transfer" };
    }
  }

  return Object.keys(patch).length > 0
    ? {
        ...tx,
        ...patch,
      }
    : tx;
};

const prepareTokenTransfer = async (
  mainAccount: Account,
  subAccount: TokenAccount,
  tx: Transaction
): Promise<TokenTransferCommand> => {
  const tokenIdParts = subAccount.id.split("/");
  const mintAddress = tokenIdParts[tokenIdParts.length - 1];
  const mintDecimals = subAccount.token.units[0].magnitude;

  const { ancillaryTokenAccOps, totalTransferableAmountIn1Tx } =
    await getTokenTransferSpec(
      mainAccount.freshAddress,
      mintAddress,
      // TODO: what if a wallet address! - must get token ass account!
      tx.recipient,
      tx.useAllAmount
        ? subAccount.spendableBalance.toNumber()
        : tx.amount.toNumber(),
      mintDecimals
    );

  return {
    kind: "token.transfer",
    mintAddress,
    ancillaryTokenAccOps,
    totalTransferableAmountIn1Tx,
  };
};

export default prepareTransaction;
