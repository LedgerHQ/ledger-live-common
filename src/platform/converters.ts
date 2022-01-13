import byFamily from "../generated/platformAdapter";

import type {
  Account,
  CryptoCurrency,
  TokenAccount,
  TokenCurrency,
  Transaction,
} from "../types";
import type {
  PlatformAccount,
  PlatformCurrency,
  PlatformTransaction,
} from "./types";

export function accountToPlatformAccount(
  account: Account | TokenAccount,
  parentAccount?: Account
): PlatformAccount {
  if (account.type === "TokenAccount") {
    if (!parentAccount) {
      throw new Error("No parent account account provided for token account");
    }

    return {
      id: account.id,
      name: `${parentAccount.name} (${account.token.ticker})`,
      address: parentAccount.freshAddress,
      currency: account.token.id,
      balance: account.balance,
      spendableBalance: account.spendableBalance,
      blockHeight: parentAccount.blockHeight,
      lastSyncDate: parentAccount.lastSyncDate,
    };
  }

  return {
    id: account.id,
    name: account.name,
    address: account.freshAddress,
    currency: account.currency.id,
    balance: account.balance,
    spendableBalance: account.spendableBalance,
    blockHeight: account.blockHeight,
    lastSyncDate: account.lastSyncDate,
  };
}
export function currencyToPlatformCurrency(
  currency: CryptoCurrency | TokenCurrency
): PlatformCurrency {
  if (currency.type === "TokenCurrency") {
    if (currency.parentCurrency.family !== "ethereum") {
      throw new Error("Only ERC20 tokens are supported");
    }

    return {
      type: "ERC20TokenCurrency",
      id: currency.id,
      ticker: currency.ticker,
      contract: currency.contractAddress,
      name: currency.name,
      chain: currency.parentCurrency.id,
      color: currency.parentCurrency.color,
      units: currency.units.map((unit) => ({
        name: unit.name,
        code: unit.code,
        magnitude: unit.magnitude,
      })),
    };
  }

  return {
    type: currency.type,
    id: currency.id,
    ticker: currency.ticker,
    name: currency.name,
    family: currency.family,
    color: currency.color,
    units: currency.units.map((unit) => ({
      name: unit.name,
      code: unit.code,
      magnitude: unit.magnitude,
    })),
  };
}

export const getPlatformTransactionSignFlowInfos = (
  platformTx: PlatformTransaction
): {
  canEditFees: boolean;
  hasFeesProvided: boolean;
  liveTx: Partial<Transaction>;
} => {
  const family = byFamily[platformTx.family];

  if (family) {
    return family.getPlatformTransactionSignFlowInfos(platformTx);
  }

  return {
    canEditFees: false,
    liveTx: { ...platformTx } as Partial<Transaction>,
    hasFeesProvided: false,
  };
};
