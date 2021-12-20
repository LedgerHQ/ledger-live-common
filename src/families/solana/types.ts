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

export type StakeWithdrawCommand = {
  kind: "stake.withdraw";
  authorizedAccAddr: string;
  stakeAccAddr: string;
  toAccAddr: string;
  amount: number;
};

export type StakeSplitCommand = {
  kind: "stake.split";
  authorizedAccAddr: string;
  stakeAccAddr: string;
  amount: number;
  seed: string;
  splitStakeAccAddr: string;
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
  | StakeUndelegateCommand
  | StakeWithdrawCommand
  | StakeSplitCommand;

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

export type StakeWithdrawTransaction = {
  kind: "stake.withdraw";
  uiState: {
    stakeAccAddr: string;
  };
};

export type StakeSplitTransaction = {
  kind: "stake.split";
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
  | StakeWithdrawTransaction
  | StakeSplitTransaction
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

export type SolanaStake = {
  stakeAccAddr: string;
  hasStakeAuth: boolean;
  hasWithdrawAuth: boolean;
  lockup:
    | {
        unixTimestamp: number;
      }
    | undefined;
  delegation:
    | {
        stake: number;
        voteAddr: string;
      }
    | undefined;
  stakeAccBalance: number;
  activation: {
    state: "active" | "inactive" | "activating" | "deactivating";
    active: number;
    inactive: number;
  };
};

export type SolanaResources = {
  stakes: SolanaStake[];
};

export type SolanaResourcesRaw = {
  stakes: string;
};

export type SolanaValidator = {
  voteAccAddr: string;
};

export type SolanaPreloadDataV1 = {
  version: "1";
  validators: SolanaValidator[];
};

// exists for discriminated union to work
export type SolanaPreloadDataV2 = {
  version: "2";
};

export type SolanaPreloadData = SolanaPreloadDataV1 | SolanaPreloadDataV2;

export const reflect = (_declare: unknown): void => {};
