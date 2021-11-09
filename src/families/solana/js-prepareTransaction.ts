import {
  AmountRequired,
  InvalidAddress,
  InvalidAddressBecauseDestinationIsAlsoSource,
  NotEnoughBalance,
  RecipientRequired,
} from "@ledgerhq/errors";
import { sum } from "lodash";
import { findSubAccountById } from "../../account";
import type { Account, TokenAccount } from "../../types";
import {
  getNetworkInfo,
  getOnChainTokenAccountsByMint,
  findAssociatedTokenAccountPubkey,
  getTokenTransferSpec,
  getTxFeeCalculator,
  getTokenAccountWithNativeBalance,
  getAssociatedTokenAccountCreationFee,
} from "./api";
import {
  SolanaMainAccountNotFunded,
  SolanaAddressOffEd25519,
  SolanaMemoIsTooLong,
  SolanaAmountNotTransferableIn1Tx,
  SolanaTokenAccountHoldsAnotherToken,
  SolanaAssociatedTokenAccountWillBeFunded,
  SolanaNotEnoughBalanceToPayFees,
} from "./errors";
import {
  Awaited,
  isAccountFunded,
  isEd25519Address,
  isValidBase58Address,
  MAX_MEMO_LENGTH,
} from "./logic";

import type {
  AncillaryTokenAccountOperation,
  CommandDescriptor,
  TokenRecipientDescriptor,
  TokenTransferCommand,
  Transaction,
  TransferCommand,
} from "./types";
import { assertUnreachable } from "./utils";

const prepareTransaction = async (
  mainAccount: Account,
  tx: Transaction
): Promise<Transaction> => {
  const patch: Partial<Transaction> = {};
  const errors: Record<string, Error> = {};

  const feeCalculator = tx.feeCalculator ?? (await getTxFeeCalculator());

  if (tx.feeCalculator === undefined) {
    patch.feeCalculator = feeCalculator;
  }

  if (!tx.useAllAmount && tx.amount.lte(0)) {
    errors.amount = new AmountRequired();
  }

  if (!tx.recipient) {
    errors.recipient = new RecipientRequired();
  } else if (mainAccount.freshAddress === tx.recipient) {
    errors.recipient = new InvalidAddressBecauseDestinationIsAlsoSource();
  } else if (!isValidBase58Address(tx.recipient)) {
    errors.recipient = new InvalidAddress();
  } else if (!isEd25519Address(tx.recipient)) {
    errors.recipient = new SolanaAddressOffEd25519();
  }

  if (tx.memo && tx.memo.length > MAX_MEMO_LENGTH) {
    errors.memo = errors.memo = new SolanaMemoIsTooLong(undefined, {
      maxLength: MAX_MEMO_LENGTH,
    });
  }

  if (Object.keys(errors).length > 0) {
    return toInvalidTx(tx, patch, errors);
  }

  if (tx.subAccountId) {
    // TODO: check all info if changed = revalidate
    const subAccount = findSubAccountById(mainAccount, tx.subAccountId);
    if (!subAccount || subAccount.type !== "TokenAccount") {
      throw new Error("subaccount not found");
    }

    if (tx.amount.gt(subAccount.spendableBalance)) {
      errors.amount = new NotEnoughBalance();
      return toInvalidTx(tx, patch, errors);
    }

    patch.commandDescriptor = await prepareTokenTransfer(
      mainAccount,
      subAccount,
      tx
    );
  } else {
    if (tx.amount.gt(mainAccount.spendableBalance)) {
      errors.amount = new NotEnoughBalance();
      return toInvalidTx(tx, patch, errors);
    }
    patch.commandDescriptor = await prepareTransfer(mainAccount, tx);
  }

  const { commandDescriptor } = patch;

  if (commandDescriptor.status === "invalid") {
    return toInvalidTx(tx, patch, errors);
  }

  const command = commandDescriptor.command;
  switch (command.kind) {
    case "transfer":
      // TODO: SWITCH TO BIGNUMBER!!!!!
      const totalSpend = command.amount + feeCalculator.lamportsPerSignature;
      if (mainAccount.balance.lt(totalSpend)) {
        errors.amount = new NotEnoughBalance();
      }
      break;
    default:
      const totalFees =
        feeCalculator.lamportsPerSignature + (commandDescriptor.fees ?? 0);
      if (mainAccount.balance.lt(totalFees)) {
        errors.amount = new SolanaNotEnoughBalanceToPayFees();
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
): Promise<CommandDescriptor<TokenTransferCommand>> => {
  const errors: Record<string, Error> = {};
  const warnings: Record<string, Error> = {};

  const tokenIdParts = subAccount.token.id.split("/");
  const mintAddress = tokenIdParts[tokenIdParts.length - 1];
  const mintDecimals = subAccount.token.units[0].magnitude;

  const txAmount = tx.useAllAmount
    ? subAccount.spendableBalance.toNumber()
    : tx.amount.toNumber();

  if (txAmount > subAccount.spendableBalance.toNumber()) {
    errors.amount = new NotEnoughBalance();
    return toInvalidStatusCommand(errors);
  }

  const accInfo = await getTokenAccountWithNativeBalance(tx.recipient);

  const fees: number[] = [];

  if (accInfo.tokenAccount instanceof Error) {
    throw accInfo.tokenAccount;
  }

  let recipientDescriptor: TokenRecipientDescriptor | undefined = undefined;

  if (accInfo.tokenAccount === undefined) {
    // get ata and if not exists look down

    const associatedTokenAccPubkey = await findAssociatedTokenAccountPubkey(
      tx.recipient,
      mintAddress
    );

    const associatedTokenAccountAddress = associatedTokenAccPubkey.toBase58();

    const shouldCreateAssociatedTokenAccount = !isAccountFunded(
      associatedTokenAccountAddress
    );

    if (shouldCreateAssociatedTokenAccount) {
      warnings.associatedTokenAccount =
        new SolanaAssociatedTokenAccountWillBeFunded();
      fees.push(await getAssociatedTokenAccountCreationFee());
    }

    recipientDescriptor = {
      kind: "account",
      //owner: tx.recipient,
      associatedTokenAccountAddress,
      shouldCreateAssociatedTokenAccount,
    };
  } else {
    if (accInfo.tokenAccount.mint.toBase58() === mintAddress) {
      // destination is the recipient!
      recipientDescriptor = {
        kind: "token-account",
      };
    } else {
      errors.recipient = new SolanaTokenAccountHoldsAnotherToken();
      return toInvalidStatusCommand(errors);
    }
  }

  if (accInfo.balance <= 0) {
    warnings.recipient = new SolanaMainAccountNotFunded();
  }

  // TODO: remove total balance
  const { totalBalance, totalTransferableAmountIn1Tx, ancillaryTokenAccOps } =
    await getTokenTransferSpec(
      mainAccount.freshAddress,
      mintAddress,
      // TODO: what if a wallet address! - must get token ass account!
      tx.recipient,
      txAmount,
      mintDecimals
    );

  if (txAmount > totalTransferableAmountIn1Tx) {
    errors.amount = new SolanaAmountNotTransferableIn1Tx();
    return toInvalidStatusCommand(errors);
  }

  if (ancillaryTokenAccOps.length > 0) {
    //TODO: think of it...
    warnings.ancillaryOps = new Error(JSON.stringify(ancillaryTokenAccOps));
  }

  // TODO: think of it...
  if (recipientDescriptor === undefined) {
    throw new Error("should not happen");
  }

  return {
    status: "valid",
    command: {
      kind: "token.transfer",
      amount: txAmount,
      ancillaryTokenAccOps,
      mintAddress,
      mintDecimals,
      recipientDescriptor: recipientDescriptor,
      memo: tx.memo,
    },
    fees: sum(fees),
    warnings,
  };
};

async function prepareTransfer(
  mainAccount: Account,
  tx: Transaction
): Promise<CommandDescriptor<TransferCommand>> {
  // TODO: check if need to run validation again, recipient changed etc..
  const recipientWalletIsUnfunded = !(await isAccountFunded(tx.recipient));
  const warnings: Record<string, Error> = {};

  // TODO: check if changed! CHECK if recipient is main wallet!

  // TODO: check amount < balance

  if (recipientWalletIsUnfunded) {
    warnings.recipient = new SolanaMainAccountNotFunded();
  }

  const txAmount = tx.useAllAmount
    ? mainAccount.spendableBalance.toNumber()
    : tx.amount.toNumber();

  return {
    status: "valid",
    command: {
      kind: "transfer",
      recipient: tx.recipient,
      amount: txAmount,
      recipientWalletIsUnfunded,
      memo: tx.memo,
    },
    warnings: Object.keys(warnings).length > 0 ? warnings : undefined,
  };
}

function getTokenRecipient(
  accInfo: Awaited<ReturnType<typeof getTokenAccountWithNativeBalance>>
) {
  throw new Error("Function not implemented.");
}

function toInvalidTx(
  tx: Transaction,
  patch: Partial<Transaction>,
  errors: Record<string, Error>
): Transaction {
  return {
    ...tx,
    ...patch,
    commandDescriptor: toInvalidStatusCommand(errors),
  };
}

function toInvalidStatusCommand(errors: Record<string, Error>) {
  return {
    status: "invalid" as const,
    errors,
  };
}

export default prepareTransaction;
