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
  getMaybeTokenAccount,
  getAssociatedTokenAccountCreationFee,
  getBalance,
} from "./api";
import {
  SolanaMainAccountNotFunded,
  SolanaAddressOffEd25519,
  SolanaMemoIsTooLong,
  SolanaAmountNotTransferableIn1Tx,
  SolanaTokenAccountHoldsAnotherToken,
  SolanaRecipientAssociatedTokenAccountWillBeFunded,
  SolanaNotEnoughBalanceToPayFees,
  SolanaTokenRecipientIsSenderATA,
} from "./errors";
import {
  Awaited,
  decodeAccountIdWithTokenAccountAddress,
  isAccountFunded,
  isEd25519Address,
  isValidBase58Address,
  MAX_MEMO_LENGTH,
} from "./logic";

import type {
  AncillaryTokenAccountOperation,
  Command,
  CommandDescriptor,
  PreparedTransactionState,
  TokenRecipientDescriptor,
  TokenTransferCommand,
  Transaction,
  TransferCommand,
  UnpreparedTokenTransferTransactionMode,
  UnpreparedTransactionMode,
  UnpreparedTransferTransactionMode,
} from "./types";
import { assertUnreachable } from "./utils";

async function deriveCommandDescriptor(
  mainAccount: Account,
  tx: Transaction,
  mode: UnpreparedTransactionMode
): Promise<CommandDescriptor<Command>> {
  const errors: Record<string, Error> = {};
  switch (mode.kind) {
    case "transfer":
    case "token.transfer":
      if (!tx.recipient) {
        errors.recipient = new RecipientRequired();
      } else if (mainAccount.freshAddress === tx.recipient) {
        errors.recipient = new InvalidAddressBecauseDestinationIsAlsoSource();
      } else if (!isValidBase58Address(tx.recipient)) {
        errors.recipient = new InvalidAddress();
      }

      if (mode.memo && mode.memo.length > MAX_MEMO_LENGTH) {
        errors.memo = errors.memo = new SolanaMemoIsTooLong(undefined, {
          maxLength: MAX_MEMO_LENGTH,
        });
      }

      if (Object.keys(errors).length > 0) {
        return toInvalidStatusCommand(errors);
      }

      return mode.kind === "transfer"
        ? deriveTransaferCommandDescriptor(mainAccount, tx, mode)
        : deriveTokenTransferDescriptor(mainAccount, tx, mode);
    case "token.createAssociatedTokenAccount":
      // TODO: fix
      return {} as any;
    default:
      return assertUnreachable(mode);
  }
}

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

  const mode = deriveMode(tx);

  const commandDescriptor = await deriveCommandDescriptor(
    mainAccount,
    tx,
    mode
  );

  if (commandDescriptor.status === "invalid") {
    return toInvalidTx(
      tx,
      patch,
      commandDescriptor.errors,
      commandDescriptor.warnings
    );
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

  if (Object.keys(errors).length > 0) {
    return toInvalidTx(tx, patch, errors);
  }

  patch.state = {
    kind: "prepared",
    commandDescriptor,
  };

  return Object.keys(patch).length > 0
    ? {
        ...tx,
        ...patch,
      }
    : tx;
};

const deriveTokenTransferDescriptor = async (
  mainAccount: Account,
  tx: Transaction,
  mode: UnpreparedTokenTransferTransactionMode
): Promise<CommandDescriptor<TokenTransferCommand>> => {
  const errors: Record<string, Error> = {};
  const warnings: Record<string, Error> = {};
  // TODO: check all info if changed = revalidate
  const subAccount = findSubAccountById(mainAccount, mode.subAccountId);
  if (!subAccount || subAccount.type !== "TokenAccount") {
    throw new Error("subaccount not found");
  }

  const tokenIdParts = subAccount.token.id.split("/");
  const mintAddress = tokenIdParts[tokenIdParts.length - 1];
  const mintDecimals = subAccount.token.units[0].magnitude;

  const senderAssociatedTokenAccountAddress =
    decodeAccountIdWithTokenAccountAddress(subAccount.id).address;

  if (tx.recipient === senderAssociatedTokenAccountAddress) {
    errors.recipient = new SolanaTokenRecipientIsSenderATA();
    return toInvalidStatusCommand(errors, warnings);
  }

  const recipientDescriptor = await getTokenRecipient(
    tx.recipient,
    mintAddress
  );

  if (recipientDescriptor instanceof Error) {
    errors.recipient = recipientDescriptor;
    return toInvalidStatusCommand(errors, warnings);
  }

  const fees = recipientDescriptor.shouldCreateAsAssociatedTokenAccount
    ? await getAssociatedTokenAccountCreationFee()
    : 0;

  if (recipientDescriptor.shouldCreateAsAssociatedTokenAccount) {
    warnings.recipientAssociatedTokenAccount =
      new SolanaRecipientAssociatedTokenAccountWillBeFunded();

    if (!(await isAccountFunded(tx.recipient))) {
      warnings.recipient = new SolanaMainAccountNotFunded();
    }
  }

  if (!tx.useAllAmount && tx.amount.lte(0)) {
    errors.amount = new AmountRequired();
    return toInvalidStatusCommand(errors, warnings);
  }

  const txAmount = tx.useAllAmount
    ? subAccount.spendableBalance.toNumber()
    : tx.amount.toNumber();

  if (txAmount > subAccount.spendableBalance.toNumber()) {
    errors.amount = new NotEnoughBalance();
    return toInvalidStatusCommand(errors, warnings);
  }

  // TODO: remove total balance
  const {
    totalBalance,
    totalTransferableAmountIn1Tx,
    ancillaryTokenAccOps: ownerAncillaryTokenAccOps,
  } = await getTokenTransferSpec(
    mainAccount.freshAddress,
    senderAssociatedTokenAccountAddress,
    mintAddress,
    recipientDescriptor,
    txAmount,
    mintDecimals
  );

  if (ownerAncillaryTokenAccOps.length > 0) {
    //TODO: think of it...
    warnings.ancillaryOps = new Error(
      JSON.stringify(ownerAncillaryTokenAccOps)
    );
  }

  if (txAmount > totalTransferableAmountIn1Tx) {
    errors.amount = new SolanaAmountNotTransferableIn1Tx();
    return toInvalidStatusCommand(errors, warnings);
  }

  return {
    status: "valid",
    command: {
      kind: "token.transfer",
      ownerAddress: mainAccount.freshAddress,
      ownerAssociatedTokenAccountAddress: senderAssociatedTokenAccountAddress,
      amount: txAmount,
      ownerAncillaryTokenAccOps,
      mintAddress,
      mintDecimals,
      recipientDescriptor: recipientDescriptor,
      memo: mode.memo,
    },
    fees,
    warnings,
  };
};

async function getTokenRecipient(
  recipientAddress: string,
  mintAddress: string
): Promise<TokenRecipientDescriptor | Error> {
  const recipientTokenAccount = await getMaybeTokenAccount(recipientAddress);

  if (recipientTokenAccount instanceof Error) {
    throw recipientTokenAccount;
  }

  if (recipientTokenAccount === undefined) {
    if (!isEd25519Address(recipientAddress)) {
      return new InvalidAddress();
    }

    const recipientAssociatedTokenAccPubkey =
      await findAssociatedTokenAccountPubkey(recipientAddress, mintAddress);

    const recipientAssociatedTokenAccountAddress =
      recipientAssociatedTokenAccPubkey.toBase58();

    // TODO: check that acc exists instead?
    const shouldCreateAsAssociatedTokenAccount = !(await isAccountFunded(
      recipientAssociatedTokenAccountAddress
    ));

    return {
      walletAddress: recipientAddress,
      shouldCreateAsAssociatedTokenAccount,
      tokenAccAddress: recipientAssociatedTokenAccountAddress,
    };
  } else if (recipientTokenAccount.mint.toBase58() !== mintAddress) {
    return new SolanaTokenAccountHoldsAnotherToken();
  }

  return {
    walletAddress: recipientTokenAccount.owner.toBase58(),
    shouldCreateAsAssociatedTokenAccount: false,
    tokenAccAddress: recipientAddress,
  };
}

async function deriveTransaferCommandDescriptor(
  mainAccount: Account,
  tx: Transaction,
  mode: UnpreparedTransferTransactionMode
): Promise<CommandDescriptor<TransferCommand>> {
  const errors: Record<string, Error> = {};
  const warnings: Record<string, Error> = {};

  if (!isEd25519Address(tx.recipient)) {
    errors.recipient = new SolanaAddressOffEd25519();
    return toInvalidStatusCommand(errors, warnings);
  }

  // TODO: check if need to run validation again, recipient changed etc..
  const recipientWalletIsUnfunded = !(await isAccountFunded(tx.recipient));
  if (recipientWalletIsUnfunded) {
    warnings.recipient = new SolanaMainAccountNotFunded();
  }

  if (!tx.useAllAmount && tx.amount.lte(0)) {
    errors.amount = new AmountRequired();
    return toInvalidStatusCommand(errors, warnings);
  }

  const txAmount = tx.useAllAmount ? mainAccount.spendableBalance : tx.amount;

  if (txAmount.gt(mainAccount.spendableBalance)) {
    errors.amount = new NotEnoughBalance();
    return toInvalidStatusCommand(errors, warnings);
  }

  return {
    status: "valid",
    command: {
      kind: "transfer",
      sender: mainAccount.freshAddress,
      recipient: tx.recipient,
      amount: txAmount.toNumber(),
      memo: mode.memo,
    },
    warnings: Object.keys(warnings).length > 0 ? warnings : undefined,
  };
}

function toInvalidTx(
  tx: Transaction,
  patch: Partial<Transaction>,
  errors: Record<string, Error>,
  warnings?: Record<string, Error>
): Transaction {
  return {
    ...tx,
    ...patch,
    state: {
      kind: "prepared",
      commandDescriptor: toInvalidStatusCommand(errors, warnings),
    },
  };
}

function toInvalidStatusCommand(
  errors: Record<string, Error>,
  warnings?: Record<string, Error>
) {
  return {
    status: "invalid" as const,
    errors,
    warnings,
  };
}

function deriveMode(tx: Transaction): UnpreparedTransactionMode {
  switch (tx.state.kind) {
    case "prepared":
      return tx.subAccountId
        ? {
            kind: "token.transfer",
            subAccountId: tx.subAccountId,
          }
        : {
            kind: "transfer",
          };
    case "unprepared":
      return tx.state.mode;
    default:
      return assertUnreachable(tx.state);
  }
}

export default prepareTransaction;