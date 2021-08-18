import { FAMILIES } from "ledger-live-platform-sdk";

import * as ethereumAdapter from "../families/ethereum/platformAdapter";
import * as bitcoinAdapter from "../families/bitcoin/platformAdapter";
import * as rippleAdapter from "../families/ripple/platformAdapter";
import * as polkadotAdapter from "../families/polkadot/platformAdapter";

import type { Account, CryptoCurrency, Transaction } from "../types";
import type {
  PlatformAccount,
  PlatformCurrency,
  PlatformTransaction,
} from "./types";

export function accountToPlatformAccount(account: Account): PlatformAccount {
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
  currency: CryptoCurrency
): PlatformCurrency {
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
  switch (platformTx.family) {
    case FAMILIES.ETHEREUM: {
      const liveTx = ethereumAdapter.convertToLiveTransaction(platformTx);

      const hasFeesProvided = ethereumAdapter.areFeesProvided(platformTx);

      return {
        canEditFees: ethereumAdapter.CAN_EDIT_FEES,
        liveTx,
        hasFeesProvided,
      };
    }

    case FAMILIES.BITCOIN: {
      const liveTx = bitcoinAdapter.convertToLiveTransaction(platformTx);

      const hasFeesProvided = bitcoinAdapter.areFeesProvided(platformTx);

      return {
        canEditFees: bitcoinAdapter.CAN_EDIT_FEES,
        liveTx,
        hasFeesProvided,
      };
    }

    case FAMILIES.RIPPLE: {
      const liveTx = rippleAdapter.convertToLiveTransaction(platformTx);

      const hasFeesProvided = rippleAdapter.areFeesProvided(platformTx);

      return {
        canEditFees: rippleAdapter.CAN_EDIT_FEES,
        liveTx,
        hasFeesProvided,
      };
    }

    case FAMILIES.POLKADOT: {
      const liveTx = polkadotAdapter.convertToLiveTransaction(platformTx);

      return {
        canEditFees: polkadotAdapter.CAN_EDIT_FEES,
        liveTx,
        hasFeesProvided: false,
      };
    }

    default:
      return {
        canEditFees: false,
        liveTx: { ...platformTx },
        hasFeesProvided: false,
      };
  }
};
