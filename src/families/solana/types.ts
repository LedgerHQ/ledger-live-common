import type { BigNumber } from "bignumber.js";
import type {
  TransactionCommon,
  TransactionCommonRaw,
} from "../../types/transaction";
import { getTxFeeCalculator } from "./api";

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
  sender: string;
  recipient: string;
  amount: number;
  memo?: string;
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
      kind: "associated-token-account";
      shouldCreate: boolean;
      address: string;
    }
  | {
      kind: "ancillary-token-account";
      address: string;
    };
export type TokenTransferCommand = {
  kind: "token.transfer";
  ownerAddress: string;
  ownerAssociatedTokenAccountAddress: string;
  recipientDescriptor: TokenRecipientDescriptor;
  //destinationAddress: string;
  amount: number;
  mintAddress: string;
  mintDecimals: number;
  // TODO: recalc total balance here as well
  //totalTransferableAmountIn1Tx: number;
  ownerAncillaryTokenAccOps: AncillaryTokenAccountOperation[];
  memo?: string;
  //recipientAssociatedTokenAccountIsUnfunded: boolean;
};

export type Command = TransferCommand | TokenTransferCommand;
export type ValidCommandDescriptor<C extends Command> = {
  status: "valid";
  command: C;
  fees?: number;
  warnings?: Record<string, Error>;
};

export type InvalidCommandDescriptor = {
  status: "invalid";
  // TODO: partial command here?
  //command: TransferCommand | TokenTransferCommand;
  errors: Record<string, Error>;
  //warnings?: Record<string, Error>;
};

export type CommandDescriptor<C extends Command> =
  | ValidCommandDescriptor<C>
  | InvalidCommandDescriptor;

export type Transaction = TransactionCommon & {
  family: "solana";
  commandDescriptor: CommandDescriptor<Command>;
  //mode: TransactionMode;
  feeCalculator?: {
    lamportsPerSignature: number;
  };
  memo?: string;
  //networkInfo?: NetworkInfo;
  //memo?: string;
  //allowUnFundedRecipient?: boolean;
};
export type TransactionRaw = TransactionCommonRaw & {
  commandDescriptorRaw: string;
  family: "solana";
  feeCalculator?: {
    lamportsPerSignature: number;
  };
  memo?: string;
  //mode: TransactionMode;
  //fees?: string;
  //networkInfo?: NetworkInfoRaw;
  //memo?: string;
  //allowUnFundedRecipient?: boolean;
};

export const reflect = (_declare: any): void => {};
