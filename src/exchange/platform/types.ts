import { BigNumber } from "bignumber.js";

import type {
  Transaction,
  Account,
  AccountLike,
  AccountRaw,
  AccountRawLike,
} from "../../types";

export type CompleteExchangeRequestEvent =
  | { type: "complete-exchange" }
  | {
      type: "complete-exchange-requested";
      estimatedFees: BigNumber;
    }
  | {
      type: "complete-exchange-error";
      error: Error;
    }
  | {
      type: "complete-exchange-result";
      completeExchangeResult: Transaction;
    };

export type Exchange = {
  fromParentAccount: Account | null | undefined;
  fromAccount: AccountLike;
  toParentAccount: Account | null | undefined;
  toAccount: AccountLike | null | undefined;
};
export type ExchangeRaw = {
  fromParentAccount: AccountRaw | null | undefined;
  fromAccount: AccountRawLike;
  toParentAccount: AccountRaw | null | undefined;
  toAccount: AccountRawLike | null | undefined;
};
