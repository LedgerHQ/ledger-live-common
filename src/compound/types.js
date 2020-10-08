// @flow
import { BigNumber } from "bignumber.js";
import type { TokenAccount, Account } from "../types";

// CDAI: how to hide it?
// - solution 1: TokenAccount#hidden
// - ( solution 2: TokenAccount#relatedTokenAccount ? )

// DAI
// in sync lifecycle: we DIGEST the cdai account into the dai account
//
// balance & balanceHistory = dai balance + cdai * rateDAICDAI
// for balance we do (dai.balance + cdai.balance * currentRate)
// for historical balance we do for each datepoint: dai.balanceHistory[i] + cdai.balanceHistory[i] * rateAtTime(date)

// CDAI operations
// CDAI IN => DAI SUPPLY
// CDAI OUT => DAI REDEEM

// transaction of mode "compound-supply" on DAI tokenId => use CDAI contract & generate a dai supply

// IDEA: if sync is not fast enough, we could introduce a concept of "fasterSync" that just refresh some key elements. (but also we should just make the incremental sync faster and allow to pull faster?)

// TODO: functions to load the rates
// similar: work ongoing for countervalues available in https://github.com/LedgerHQ/ledger-live-common/pull/634
// see https://github.com/LedgerHQ/ledger-live-common/blob/8cff35bc562b7cbdb14c968ded8dc7f39d818f28/src/countervalues/modules/compound.js
// note: it's unclear how this will work together at this stage

// APPROVE operation on erc20

// Note: if an account defines a balanceHistory, then it's used instead of the default js implementation that dynamically uses operations, we must do this to "hijack" the balance history

// to represent and use what is the real dai account balance, we need to introduce spendable concept:
// new field TokenAccount#spendableBalance <- dai balance
// bridge of ethereum must take into account the real dai balance

// IDEA: on the assets distribution, we could represent the spendable part of an asset, this idea is valid not only for compound

// ? LOGO Token

// loaded in preload()?
export type CompoundAssetMetric = {
  grossSupply: number,
  currentAPY: number,
};
// formatGrossSupply: CompoundAssetMetric => string
// formatAPYPercentage: CompoundAssetMetric => string

export type CompoundNetworkInfo = {
  assets: CompoundAssetMetric[],
};
// loadCompoundNetworkInfo: () => Promise<CompoundNetworkInfo>

// sumCurrencyBalance: (Account[], Currency) => BigNumber

// implement data needed for a row of the UI
export type OpenedLoanStatus =
  | "ENABLING"
  | "TO_SUPPLY"
  | "SUPPLYING"
  | "SUPPLIED"; // NOTE: Not sure we need this

type LoanInternal = {
  amountSupplied: BigNumber, // in account.token unit
  interestsEarned: BigNumber, // in account.token unit
  startingDate: Date,
  percentageEarned: number,
};

export type OpenedLoan = LoanInternal & {};

export type ClosedLoan = LoanInternal & {
  endDate: Date,
};

export type ClosedLoanHistory = ClosedLoan & {
  account: TokenAccount,
  parentAccount: ?Account,
};
export type ClosedLoansHistory = ClosedLoanHistory[];

export type Loan = OpenedLoan | ClosedLoan;
export type LoansLikeArray = OpenedLoan[] | ClosedLoan[];

export type CompoundAccountSummary = {
  opened: OpenedLoan[],
  closed: ClosedLoan[],
  account: TokenAccount,
  parentAccount: ?Account,
  totalSupplied: BigNumber,
  allTimeEarned: BigNumber,
  accruedInterests: BigNumber,
  // status: OpenedLoanStatus, // TODO
  // ? history: TODO
};

// summaryCompoundAccount: (AccountLike, Account) => CompoundAccountsSummary
// mergeCompoundAccountsSummary: CompoundAccountSummary[] => CompoundAccountSummary

//
