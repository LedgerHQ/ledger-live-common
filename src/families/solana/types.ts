import type {
  TransactionCommon,
  TransactionCommonRaw,
} from "../../types/transaction";

// for legacy reasons export the types
export type CoreStatics = Record<string, never>;
export type CoreAccountSpecifics = Record<string, never>;
export type CoreOperationSpecifics = Record<string, never>;
export type CoreCurrencySpecifics = Record<string, never>;

export type TransferCommand = {
  kind: "transfer";
  sender: string;
  recipient: string;
  amount: number;
  memo?: string;
};

export type TokenCreateATACommand = {
  kind: "token.createATA";
  owner: string;
  mint: string;
  associatedTokenAccountAddress: string;
};

export type StakeCreateAccountCommand = {
  kind: "stake.createAccount";
  fromAccAddress: string;
  stakeAccAddress: string;
  seed: string;
  amount: number;
  delegate?: {
    voteAccAddress: string;
  };
};

export type StakeDelegateCommand = {
  kind: "stake.delegate";
  authorizedAccAddr: string;
  stakeAccAddr: string;
  voteAccAddr: string;
};

export type StakeUndelegateCommand = {
  kind: "stake.undelegate";
  authorizedAccAddr: string;
  stakeAccAddr: string;
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
  | TokenCreateATACommand
  | StakeCreateAccountCommand
  | StakeDelegateCommand
  | StakeUndelegateCommand;

export type ValidCommandDescriptor = {
  status: "valid";
  command: Command;
  fees?: number;
  warnings?: Record<string, Error>;
};

export type InvalidCommandDescriptor = {
  status: "invalid";
  errors: Record<string, Error>;
  warnings?: Record<string, Error>;
};

export type CommandDescriptor<> =
  | ValidCommandDescriptor
  | InvalidCommandDescriptor;

export type TransferTransaction = {
  kind: "transfer";
  uiState: {
    memo?: string;
  };
};

export type TokenTransferTransaction = {
  kind: "token.transfer";
  uiState: {
    subAccountId: string;
    memo?: string;
  };
};

export type TokenCreateATATransaction = {
  kind: "token.createATA";
  uiState: {
    tokenId: string;
  };
};

export type StakeCreateAccountTransaction = {
  kind: "stake.createAccount";
  uiState: {
    delegate?: {
      voteAccAddress: string;
    };
  };
};

export type StakeDelegateTransaction = {
  kind: "stake.delegate";
  uiState: {
    stakeAccAddr: string;
    voteAccAddr: string;
  };
};

export type StakeUndelegateTransaction = {
  kind: "stake.undelegate";
  uiState: {
    stakeAccAddr: string;
  };
};

export type TransactionModel = { commandDescriptor?: CommandDescriptor } & (
  | TransferTransaction
  | TokenTransferTransaction
  | TokenCreateATATransaction
  | StakeCreateAccountTransaction
  | StakeDelegateTransaction
  | StakeUndelegateTransaction
);

export type Transaction = TransactionCommon & {
  family: "solana";
  model: TransactionModel;
  feeCalculator?: {
    lamportsPerSignature: number;
  };
};

export type TransactionRaw = TransactionCommonRaw & {
  family: "solana";
  model: string;
  feeCalculator?: {
    lamportsPerSignature: number;
  };
};

export const reflect = (_declare: unknown): void => {};
