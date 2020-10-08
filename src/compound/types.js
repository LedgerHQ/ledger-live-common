// @flow
import { BigNumber } from "bignumber.js";
import type { TokenAccount, Account } from "../types";

// ? LOGO Token

export type CompoundAssetMetric = {
  grossSupply: number,
  currentAPY: number,
};

export type CompoundNetworkInfo = {
  assets: CompoundAssetMetric[],
};

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

export type OpenedLoan = LoanInternal & {
  status: OpenedLoanStatus,
};

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
};
