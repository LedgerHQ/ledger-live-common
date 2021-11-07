import {
  AmountRequired,
  InvalidAddress,
  InvalidAddressBecauseDestinationIsAlsoSource,
  NotEnoughBalance,
  RecipientRequired,
} from "@ledgerhq/errors";
import { findSubAccountById } from "../../account";
import type { Account, TokenAccount } from "../../types";
import {
  getNetworkInfo,
  getOnChainTokenAccountsByMint,
  findAssociatedTokenAddress,
  getTokenTransferSpec,
  getTxFees,
} from "./api";
import { SolanaAccountNotFunded, SolanaAddressOffEd25519 } from "./errors";
import {
  isAccountFunded,
  isEd25519Address,
  isValidBase58Address,
  MAX_MEMO_LENGTH,
} from "./logic";

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
  const errors: Record<string, Error> = {};
  const warnings: Record<string, Error> = {};

  const fees = tx.fees ?? (await getTxFees());

  if (tx.fees === undefined) {
    patch.fees = fees;
  }

  if (!tx.useAllAmount && tx.amount.lte(0)) {
    errors.amount = new AmountRequired();
  }

  if (!errors.amount && mainAccount.balance.lte(fees)) {
    errors.amount = new NotEnoughBalance();
  }

  if (!tx.recipient) {
    errors.recipient = new RecipientRequired();
  } else if (mainAccount.freshAddress === tx.recipient) {
    errors.recipient = new InvalidAddressBecauseDestinationIsAlsoSource();
  } else if (!isValidBase58Address(tx.recipient)) {
    errors.recipient = new InvalidAddress();
  } else if (!isEd25519Address(tx.recipient)) {
    errors.recipient = new SolanaAddressOffEd25519();
  } else if (!(await isAccountFunded(tx.recipient))) {
    warnings.recipient = new SolanaAccountNotFunded();
  }

  if (tx.memo && tx.memo.length > MAX_MEMO_LENGTH) {
    errors.memo = errors.memo = new SolanaMemoIsTooLong(undefined, {
      maxLength: MAX_MEMO_LENGTH,
    });
  }

  if (tx.subAccountId) {
    if (tx.command.kind !== "token.transfer") {
      const subAccount = findSubAccountById(mainAccount, tx.subAccountId);
      if (!subAccount || subAccount.type !== "TokenAccount") {
        throw new Error("subaccount not found");
      }
      try {
        patch.command = await prepareTokenTransfer(mainAccount, subAccount, tx);
      } catch (e) {
        throw e;
      }
    }
  } else {
    // native sol transfer
    if (tx.command === undefined || tx.command.kind !== "transfer") {
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
