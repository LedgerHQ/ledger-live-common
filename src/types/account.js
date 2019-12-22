// @flow

import type { BigNumber } from "bignumber.js";
import type { CryptoCurrency, TokenCurrency, Unit } from "./currencies";
import type { OperationRaw, Operation } from "./operation";
import type { DerivationMode } from "../derivation";
import type { BalanceHistory } from "./portfolio";

// A token belongs to an Account and share the parent account address
export type TokenAccount = {
  type: "TokenAccount",
  id: string,
  // id of the parent account this token accuont belongs to
  parentId: string,
  token: TokenCurrency,
  balance: BigNumber,
  operations: Operation[],
  pendingOperations: Operation[]
};

// A child account belongs to an Account but has its own address
export type ChildAccount = {
  type: "ChildAccount",
  id: string,
  name: string,
  // id of the parent account this token accuont belongs to
  parentId: string,
  currency: CryptoCurrency,
  address: string,
  balance: BigNumber,
  operations: Operation[],
  pendingOperations: Operation[],
  capabilities: {
    isDelegatable?: boolean,
    isSpendable?: boolean
  }
};

export type Address = {|
  address: string,
  derivationPath: string
|};

export type Account = {
  type: "Account",
  // unique account identifier
  id: string,

  // a unique way to identify a seed the account was associated with
  // it MUST be different between 2 seeds
  // but it is not necessarily the same between 2 accounts (if possible – not always possible)
  // in BTC like accounts, we use pubKey(purpose'/coinType')
  // For other accounts that don't have sub derivation, we have used the account address
  seedIdentifier: string,

  // account xpub if available
  xpub?: string,

  // Identify the derivation used. it allows us to map this to a derivation scheme.
  // example of values: segwit | unsplit | segwit_unsplit | mew | eth_mew (eg for etc accounts on eth)
  // the special value of '' means it's bip44 with purpose 44.
  derivationMode: DerivationMode,

  // the iterated number to derivate the account in a given derivationMode config
  // in context of bip44, it would be the account field of bip44 ( m/purpose'/cointype'/account' )
  index: number,

  // next receive address. to be used to display to user.
  // (deprecated - corresponds to freshAddresses[0].address)
  freshAddress: string,

  // The path linked to freshAddress. to be used to validate with the device if it corresponds to freshAddress.
  // example: 44'/0'/0'/0/0
  // (deprecated - corresponds to freshAddresses[0].derivationPath)
  freshAddressPath: string,

  // an array containing all fresh addresses and paths
  // may be empty if no sync has occurred
  freshAddresses: Address[],

  // account name
  name: string,

  // account balance in satoshi
  balance: BigNumber,

  // part of the balance that can effectively be spent
  spendableBalance: BigNumber,

  // the last block height currently synchronized
  blockHeight: number,

  // ------------------------------------- Specific account fields

  // currency of this account
  currency: CryptoCurrency,

  // user preferred unit to use. unit is coming from currency.units. You can assume currency.units.indexOf(unit) will work. (make sure to preserve reference)
  unit: Unit,

  // lazy list of operations that exists on the blockchain.
  operations: Operation[],

  // pending operations that has been broadcasted but are not yet in operations
  // this is for optimistic updates UI. the Operation objects are temporary and
  // might not be the real one that will arrives on operations array.
  // only Operation#id needs to be guaranteed the same.
  // the array resulting of pendingOperations.concat(operations)
  // is guaranteed to contains unique ops (by id) at any time and also is time DESC sorted.
  pendingOperations: Operation[],

  // used to know when the last sync happened
  lastSyncDate: Date,

  // A configuration for the endpoint to use. (usecase: Ripple node)
  // FIXME drop and introduce a config{} object
  endpointConfig?: ?string,

  // An account can have sub accounts.
  // A sub account can be either a token account or a child account in some blockchain.
  // They are attached to the parent account in the related blockchain.
  // CONVENTION:
  // a SubAccount is living inside an Account but is not an entity on its own,
  // therefore, there is no .parentAccount in it, which will means you will need to always have a tuple of (parentAccount, account)
  // we will use the naming (parentAccount, account) everywhere because a sub account is not enough and you need the full context with this tuple.
  // These are two valid examples:
  // I'm inside a ZRX token account of Ethereum 1: { parentAccount: Ethereum 1, account: ZRX }
  // I'm just inside the Ethereum 1: { account: Ethereum 1, parentAccount: undefined }
  // "account" is the primary account that you use/select/view. It is a `AccountLike`.
  // "parentAccount", if available, is the contextual account. It is a `?Account`.
  subAccounts?: SubAccount[],

  // An array of { Date: BigNumber } pairs that represented the balance evolution throughout
  // time. This can be used to represent the balance in things like the chart without recomputing
  // the operations for an account.
  balanceHistory?: BalanceHistory
};

export type SubAccount = TokenAccount | ChildAccount;
export type AccountLike = Account | SubAccount;

// Damn it flow. can't you support covariance.
export type AccountLikeArray =
  // $FlowFixMe wtf mobile
  AccountLike[] | TokenAccount[] | ChildAccount[] | Account[];

export type TokenAccountRaw = {
  type: "TokenAccountRaw",
  id: string,
  parentId: string,
  tokenId: string,
  operations: OperationRaw[],
  pendingOperations: OperationRaw[],
  balance: string
};

export type ChildAccountRaw = {
  type: "ChildAccountRaw",
  id: string,
  name: string,
  parentId: string,
  currencyId: string,
  address: string,
  operations: OperationRaw[],
  pendingOperations: OperationRaw[],
  balance: string,
  capabilities: {
    isDelegatable?: boolean,
    isSpendable?: boolean
  }
};

export type AccountRaw = {
  id: string,
  seedIdentifier: string,
  xpub?: string,
  derivationMode: DerivationMode,
  index: number,
  freshAddress: string,
  freshAddressPath: string,
  freshAddresses: Address[],
  name: string,
  balance: string,
  spendableBalance?: string,
  blockHeight: number,
  // ------------------------------------- Specific raw fields
  currencyId: string,
  operations: OperationRaw[],
  pendingOperations: OperationRaw[],
  unitMagnitude: number,
  lastSyncDate: string,
  endpointConfig?: ?string,
  subAccounts?: SubAccountRaw[]
};

export type SubAccountRaw = TokenAccountRaw | ChildAccountRaw;
export type AccountRawLike = AccountRaw | SubAccountRaw;
