import { getTokenById } from "@ledgerhq/cryptoassets";
import {
  AmountRequired,
  InvalidAddress,
  InvalidAddressBecauseDestinationIsAlsoSource,
  NotEnoughBalance,
  RecipientRequired,
} from "@ledgerhq/errors";
import { findSubAccountById } from "../../account";
import type { Account } from "../../types";
import { ChainAPI } from "./api/web4";
import {
  SolanaAccountNotFunded,
  SolanaAddressOffEd25519,
  SolanaMemoIsTooLong,
  SolanaTokenAccountHoldsAnotherToken,
  SolanaRecipientAssociatedTokenAccountWillBeFunded,
  SolanaNotEnoughBalanceToPayFees,
  SolanaTokenRecipientIsSenderATA,
  SolanaTokenAccounNotInitialized,
} from "./errors";
import {
  decodeAccountIdWithTokenAccountAddress,
  isEd25519Address,
  isValidBase58Address,
  MAX_MEMO_LENGTH,
} from "./logic";

import type {
  CommandDescriptor,
  PrepareTxAPI,
  TokenCreateATATransaction,
  TokenRecipientDescriptor,
  TokenTransferTransaction,
  Transaction,
  TransactionModel,
  TransferTransaction,
} from "./types";
import { assertUnreachable } from "./utils";

async function deriveCommandDescriptor(
  mainAccount: Account,
  tx: Transaction,
  api: PrepareTxAPI
): Promise<CommandDescriptor> {
  const errors: Record<string, Error> = {};

  const { model } = tx;

  switch (model.kind) {
    case "transfer":
    case "token.transfer":
      if (!tx.recipient) {
        errors.recipient = new RecipientRequired();
      } else if (mainAccount.freshAddress === tx.recipient) {
        errors.recipient = new InvalidAddressBecauseDestinationIsAlsoSource();
      } else if (!isValidBase58Address(tx.recipient)) {
        errors.recipient = new InvalidAddress();
      }

      if (model.uiState.memo) {
        const encoder = new TextEncoder();
        if (encoder.encode(model.uiState.memo).byteLength > MAX_MEMO_LENGTH) {
          errors.memo = errors.memo = new SolanaMemoIsTooLong(undefined, {
            maxLength: MAX_MEMO_LENGTH,
          });
        }
      }

      if (Object.keys(errors).length > 0) {
        return toInvalidStatusCommand(errors);
      }

      return model.kind === "transfer"
        ? deriveTransaferCommandDescriptor(mainAccount, tx, model, api)
        : deriveTokenTransferCommandDescriptor(mainAccount, tx, model, api);
    case "token.createATA":
      return deriveCreateAssociatedTokenAccountCommandDescriptor(
        mainAccount,
        model,
        api
      );
    default:
      return assertUnreachable(model);
  }
}

const prepareTransaction = async (
  mainAccount: Account,
  tx: Transaction,
  api: ChainAPI
): Promise<Transaction> => {
  const patch: Partial<Transaction> = {};
  const errors: Record<string, Error> = {};

  const feeCalculator = tx.feeCalculator ?? (await api.getTxFeeCalculator());

  if (tx.feeCalculator === undefined) {
    patch.feeCalculator = feeCalculator;
  }

  const txToDeriveFrom = updateModelIfSubAccountIdPresent(tx);

  const commandDescriptor = await deriveCommandDescriptor(
    mainAccount,
    txToDeriveFrom,
    api
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
    case "transfer": {
      const totalSpend = command.amount + feeCalculator.lamportsPerSignature;
      if (mainAccount.balance.lt(totalSpend)) {
        errors.amount = new NotEnoughBalance();
      }
      break;
    }
    default: {
      const totalFees =
        feeCalculator.lamportsPerSignature + (commandDescriptor.fees ?? 0);
      if (mainAccount.balance.lt(totalFees)) {
        errors.amount = new SolanaNotEnoughBalanceToPayFees();
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return toInvalidTx(tx, patch, errors);
  }

  patch.model = {
    ...tx.model,
    commandDescriptor,
  };

  return Object.keys(patch).length > 0
    ? {
        ...tx,
        ...patch,
      }
    : tx;
};

const deriveTokenTransferCommandDescriptor = async (
  mainAccount: Account,
  tx: Transaction,
  model: TransactionModel & { kind: TokenTransferTransaction["kind"] },
  api: PrepareTxAPI
): Promise<CommandDescriptor> => {
  const errors: Record<string, Error> = {};
  const warnings: Record<string, Error> = {};

  const subAccount = findSubAccountById(
    mainAccount,
    model.uiState.subAccountId
  );

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
    mintAddress,
    api
  );

  if (recipientDescriptor instanceof Error) {
    errors.recipient = recipientDescriptor;
    return toInvalidStatusCommand(errors, warnings);
  }

  const fees = recipientDescriptor.shouldCreateAsAssociatedTokenAccount
    ? await api.getAssociatedTokenAccountCreationFee()
    : 0;

  if (recipientDescriptor.shouldCreateAsAssociatedTokenAccount) {
    warnings.recipientAssociatedTokenAccount =
      new SolanaRecipientAssociatedTokenAccountWillBeFunded();

    if (!(await isAccountFunded(tx.recipient, api))) {
      warnings.recipient = new SolanaAccountNotFunded();
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

  return {
    status: "valid",
    command: {
      kind: "token.transfer",
      ownerAddress: mainAccount.freshAddress,
      ownerAssociatedTokenAccountAddress: senderAssociatedTokenAccountAddress,
      amount: txAmount,
      mintAddress,
      mintDecimals,
      recipientDescriptor: recipientDescriptor,
      memo: model.uiState.memo,
    },
    fees,
    warnings,
  };
};

async function getTokenRecipient(
  recipientAddress: string,
  mintAddress: string,
  api: PrepareTxAPI
): Promise<TokenRecipientDescriptor | Error> {
  const recipientTokenAccount = await api.getMaybeTokenAccount(
    recipientAddress
  );

  if (recipientTokenAccount instanceof Error) {
    throw recipientTokenAccount;
  }

  if (recipientTokenAccount === undefined) {
    if (!isEd25519Address(recipientAddress)) {
      return new SolanaAddressOffEd25519();
    }

    const recipientAssociatedTokenAccPubkey =
      await api.findAssociatedTokenAccountPubkey(recipientAddress, mintAddress);

    const recipientAssociatedTokenAccountAddress =
      recipientAssociatedTokenAccPubkey.toBase58();

    const shouldCreateAsAssociatedTokenAccount = !(await isAccountFunded(
      recipientAssociatedTokenAccountAddress,
      api
    ));

    return {
      walletAddress: recipientAddress,
      shouldCreateAsAssociatedTokenAccount,
      tokenAccAddress: recipientAssociatedTokenAccountAddress,
    };
  } else {
    if (recipientTokenAccount.mint.toBase58() !== mintAddress) {
      return new SolanaTokenAccountHoldsAnotherToken();
    }
    if (recipientTokenAccount.state !== "initialized") {
      return new SolanaTokenAccounNotInitialized();
    }
  }

  return {
    walletAddress: recipientTokenAccount.owner.toBase58(),
    shouldCreateAsAssociatedTokenAccount: false,
    tokenAccAddress: recipientAddress,
  };
}

async function deriveCreateAssociatedTokenAccountCommandDescriptor(
  mainAccount: Account,
  model: TransactionModel & { kind: TokenCreateATATransaction["kind"] },
  api: PrepareTxAPI
): Promise<CommandDescriptor> {
  const token = getTokenById(model.uiState.tokenId);
  const tokenIdParts = token.id.split("/");
  const mint = tokenIdParts[tokenIdParts.length - 1];

  const associatedTokenAccountPubkey =
    await api.findAssociatedTokenAccountPubkey(mainAccount.freshAddress, mint);

  const associatedTokenAccountAddress = associatedTokenAccountPubkey.toBase58();

  const fees = await api.getAssociatedTokenAccountCreationFee();

  return {
    status: "valid",
    fees,
    command: {
      kind: model.kind,
      mint: mint,
      owner: mainAccount.freshAddress,
      associatedTokenAccountAddress,
    },
  };
}

async function deriveTransaferCommandDescriptor(
  mainAccount: Account,
  tx: Transaction,
  model: TransactionModel & { kind: TransferTransaction["kind"] },
  api: PrepareTxAPI
): Promise<CommandDescriptor> {
  const errors: Record<string, Error> = {};
  const warnings: Record<string, Error> = {};

  if (!isEd25519Address(tx.recipient)) {
    warnings.recipientOffCurve = new SolanaAddressOffEd25519();
  }

  const recipientWalletIsUnfunded = !(await isAccountFunded(tx.recipient, api));
  if (recipientWalletIsUnfunded) {
    warnings.recipient = new SolanaAccountNotFunded();
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
      memo: model.uiState.memo,
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
    model: {
      ...tx.model,
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

// if subaccountid present - it's a token transfer
function updateModelIfSubAccountIdPresent(tx: Transaction): Transaction {
  if (tx.subAccountId) {
    return {
      ...tx,
      model: {
        kind: "token.transfer",
        uiState: {
          ...tx.model.uiState,
          subAccountId: tx.subAccountId,
        },
      },
    };
  }

  return tx;
}

async function isAccountFunded(
  address: string,
  api: PrepareTxAPI
): Promise<boolean> {
  const balance = await api.getBalance(address);
  return balance > 0;
}

export { prepareTransaction };
