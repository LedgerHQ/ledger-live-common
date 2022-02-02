import type { BigNumber } from "bignumber.js";
import type {
  TransactionCommon,
  TransactionCommonRaw,
} from "../../types/transaction";

// for legacy
export type CoreStatics = Record<any, any>;
export type CoreAccountSpecifics = Record<any, any>;
export type CoreOperationSpecifics = Record<any, any>;
export type CoreCurrencySpecifics = Record<any, any>;

export enum PaymentChain {
  external = 0,
  internal = 1,
}

export enum StakeChain {
  stake = 2,
}

export enum NetworkId {
  testnet = 0,
  mainnet = 1,
}

export type BipPath = {
  purpose: 1852;
  coin: 1815;
  account: number;
  chain: number;
  index: number;
};

export type Token = {
  assetName: string;
  policyId: string;
  value: BigNumber;
};

export type TokenRaw = {
  assetName: string;
  policyId: string;
  value: string;
};

export type PaymentCredential = {
  isUsed: boolean;
  key: string;
  bipPath: BipPath;
};

export type PaymentCredentialRaw = {
  isUsed: boolean;
  key: string;
  bipPath: BipPath;
};

export type StakeCredential = {
  key: string;
  bipPath: BipPath;
};

export type CardanoOutput = {
  hash: string;
  index: number;
  address: string;
  amount: BigNumber;
  tokens: Array<Token>;
  paymentCredential: {
    key: string;
    bipPath?: BipPath;
  };
  stakeCredential?: {
    key: string;
    bipPath?: BipPath;
  };
};

export type CardanoOutputRaw = {
  hash: string;
  index: number;
  address: string;
  amount: string;
  tokens: Array<TokenRaw>;
  paymentCredential: {
    key: string;
    bipPath?: BipPath;
  };
  stakeCredential?: {
    key: string;
    bipPath?: BipPath;
  };
};

/**
 * Cardano account resources
 */
export type CardanoResources = {
  externalCredentials: Array<PaymentCredential>;
  internalCredentials: Array<PaymentCredential>;
  utxos: Array<CardanoOutput>;
};

/**
 * Cardano account resources from raw JSON
 */
export type CardanoResourcesRaw = {
  externalCredentials: Array<PaymentCredentialRaw>;
  internalCredentials: Array<PaymentCredentialRaw>;
  utxos: Array<CardanoOutputRaw>;
};

/**
 * Cardano transaction
 */
export type Transaction = TransactionCommon & {
  mode: string;
  family: "cardano";
  fees?: BigNumber;
  // add here all transaction-specific fields if you implement other modes than "send"
};

/**
 * Cardano transaction from a raw JSON
 */
export type TransactionRaw = TransactionCommonRaw & {
  family: "cardano";
  mode: string;
  fees?: string;
  // also the transaction fields as raw JSON data
};

// /**
//  * Cardano currency data that will be preloaded.
//  * You can for instance add a list of validators for Proof-of-Stake blockchains,
//  * or any volatile data that could not be set as constants in the code (staking progress, fee estimation variables, etc.)
//  */
// export type CardanoPreloadData = {
//   somePreloadedData: Record<any, any>;
// };

export const reflect = (_declare: unknown): void => {};
