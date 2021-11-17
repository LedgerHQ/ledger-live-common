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
  sender: string;
  recipient: string;
  amount: number;
  memo?: string;
};

export type CreateAssociatedTokenAccountCommand = {
  kind: "token.createAssociatedTokenAccount";
  owner: string;
  mint: string;
  associatedTokenAccountAddress: string;
};

export type TokenRecipientDescriptor = {
  walletAddress: string;
  tokenAccAddress: string;
  shouldCreateAsAssociatedTokenAccount: boolean;
};

export type TokenTransferCommand = {
  kind: "token.transfer";
  ownerAddress: string;
  ownerAssociatedTokenAccountAddress: string;
  recipientDescriptor: TokenRecipientDescriptor;
  amount: number;
  mintAddress: string;
  mintDecimals: number;
  memo?: string;
};

export type Command =
  | TransferCommand
  | TokenTransferCommand
  | CreateAssociatedTokenAccountCommand;

export type ValidCommandDescriptor<C extends Command> = {
  status: "valid";
  command: C;
  fees?: number;
  warnings?: Record<string, Error>;
};

export type InvalidCommandDescriptor = {
  status: "invalid";
  errors: Record<string, Error>;
  warnings?: Record<string, Error>;
};

export type CommandDescriptor<C extends Command> =
  | ValidCommandDescriptor<C>
  | InvalidCommandDescriptor;

export type UnpreparedTransferTransactionMode = {
  kind: TransferCommand["kind"];
  memo?: string;
};

export type UnpreparedTokenTransferTransactionMode = {
  kind: TokenTransferCommand["kind"];
  subAccountId: string;
  memo?: string;
};

export type UnpreparedCreateAssociatedTokenAccountTransactionMode = {
  kind: CreateAssociatedTokenAccountCommand["kind"];
  tokenId: string;
};

export type UnpreparedTransactionMode =
  | UnpreparedTransferTransactionMode
  | UnpreparedTokenTransferTransactionMode
  | UnpreparedCreateAssociatedTokenAccountTransactionMode;

export type UnpreparedTransactionState = {
  kind: "unprepared";
  mode: UnpreparedTransactionMode;
};

export type PreparedTransactionState = {
  kind: "prepared";
  commandDescriptor: CommandDescriptor<Command>;
};

export type TransactionState =
  | PreparedTransactionState
  | UnpreparedTransactionState;

export type Transaction = TransactionCommon & {
  family: "solana";
  state: TransactionState;
  feeCalculator?: {
    lamportsPerSignature: number;
  };
};

export type TransactionRaw = TransactionCommonRaw & {
  family: "solana";
  state: string;
  feeCalculator?: {
    lamportsPerSignature: number;
  };
};

export const reflect = (_declare: any): void => {};
