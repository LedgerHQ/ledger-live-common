import type { BigNumber } from "bignumber.js";
import type {
  TransactionCommon,
  TransactionCommonRaw,
} from "../../types/transaction";

// for legacy reasons export the types
export type CoreStatics = Record<string, never>;
export type CoreAccountSpecifics = Record<string, never>;
export type CoreOperationSpecifics = Record<string, never>;
export type CoreCurrencySpecifics = Record<string, never>;

/*
export type NetworkInfo = {
  family: "solana";
  lamportsPerSignature: BigNumber;
};

export type NetworkInfoRaw = {
  family: "solana";
  lamportPerSignature: string;
};
*/

/*
type TokenTransactionSpec = {
  kind: "prepared";
  mintAddress: string;
  decimals: number;
};

type UnpreparedTokenTransactionSpec = {
  kind: "unprepared";
  subAccountId: string;
};

type TokenTransactionMode = {
  kind: "token";
  fundRecipient: boolean;
  spec: UnpreparedTokenTransactionSpec | TokenTransactionSpec;
};

type NativeTransactionMode = {
  kind: "native";
};

export type TransactionMode = NativeTransactionMode | TokenTransactionMode;
*/

export type TransferCommand = {
  kind: "transfer";
  memo?: string;
  recipient: string;
  amount: number;
  recipientWalletIsUnfunded: boolean;
};

type AncillaryTokenAccountTransferOperation = {
  kind: "ancillary.token.transfer";
  sourceTokenAccAddress: string;
  amount: number;
};

type AncillaryTokenAccountCloseOperation = {
  kind: "ancillary.token.close";
  tokenAccAddress: string;
};

export type AncillaryTokenAccountOperation =
  | AncillaryTokenAccountTransferOperation
  | AncillaryTokenAccountCloseOperation;

export type TokenRecipientDescriptor =
  | {
      kind: "account";
      associatedTokenAccountAddress: string;
      shouldCreateAssociatedTokenAccount: boolean;
    }
  | {
      kind: "token-account";
    };
export type TokenTransferCommand = {
  kind: "token.transfer";
  recipientDescriptor: TokenRecipientDescriptor;
  //destinationAddress: string;
  amount: number;
  mintAddress: string;
  mintDecimals: number;
  // TODO: recalc total balance here as well
  //totalTransferableAmountIn1Tx: number;
  ancillaryTokenAccOps: AncillaryTokenAccountOperation[];
  memo?: string;
  //recipientWalletIsUnfunded: boolean;
  //recipientAssociatedTokenAccountIsUnfunded: boolean;
};

type Command = TransferCommand | TokenTransferCommand;
export type CommandDescriptor<C extends Command> =
  | {
      status: "valid";
      command: C;
      fees?: number;
      warnings?: Record<string, Error>;
    }
  | {
      status: "invalid";
      // TODO: partial command here?
      //command: TransferCommand | TokenTransferCommand;
      errors: Record<string, Error>;
      //warnings?: Record<string, Error>;
    };

export type Transaction = TransactionCommon & {
  family: "solana";
  commandDescriptor: CommandDescriptor<Command>;
  //mode: TransactionMode;
  fees?: number;
  memo?: string;
  //networkInfo?: NetworkInfo;
  //memo?: string;
  //allowUnFundedRecipient?: boolean;
};
export type TransactionRaw = TransactionCommonRaw & {
  commandDescriptorRaw: string;
  family: "solana";
  fees?: number;
  memo?: string;
  //mode: TransactionMode;
  //fees?: string;
  //networkInfo?: NetworkInfoRaw;
  //memo?: string;
  //allowUnFundedRecipient?: boolean;
};

export const reflect = (_declare: any): void => {};
