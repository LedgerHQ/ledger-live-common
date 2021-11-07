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

type TransferCommand = {
  kind: "transfer";
  memo?: string;
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

export type TokenTransferCommand = {
  kind: "token.transfer";
  mintAddress: string;
  amount: number;
  commandFees?: number;
  totalTransferableAmountIn1Tx: number;
  ancillaryTokenAccOps: AncillaryTokenAccountOperation[];
  memo?: string;
  recipientWalletIsUnfunded: boolean;
  recipientAssociatedTokenAccountIsUnfunded: boolean;
};

export type CommandDescriptor =
  | {
      state: "valid";
      command: TransferCommand | TokenTransferCommand;
      warnings?: Record<string, Error>;
    }
  | {
      state: "invalid";
      errors: Record<string, Error>;
    };

export type Transaction = TransactionCommon & {
  family: "solana";
  commandDescriptor: CommandDescriptor;
  //mode: TransactionMode;
  fees?: number;
  //networkInfo?: NetworkInfo;
  //memo?: string;
  //allowUnFundedRecipient?: boolean;
};
export type TransactionRaw = TransactionCommonRaw & {
  commandDescriptorRaw: string;
  family: "solana";
  fees?: number;
  //mode: TransactionMode;
  //fees?: string;
  //networkInfo?: NetworkInfoRaw;
  //memo?: string;
  //allowUnFundedRecipient?: boolean;
};

export const reflect = (_declare: any): void => {};
