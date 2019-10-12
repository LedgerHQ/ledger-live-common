// @flow
import { AccountResponse, Server } from "stellar-sdk";
import { BigNumber } from "bignumber.js";
import { getEnv } from "../../../env";
import { parseCurrencyUnit } from "../../../currencies";
import { getCryptoCurrencyById } from "../../../data/cryptocurrencies";

const stellarUnit = getCryptoCurrencyById("stellar").units[0];

const getServer = (_: any) => {
  if (getEnv("STELLAR_USE_TESTNET")) {
    return new Server("https://horizon-testnet.stellar.org");
  }
  return new Server("https://horizon.stellar.org");
};

export const parseAPIValue = (value: string) => {
  if (!value) {
    return new BigNumber(0);
  }
  return parseCurrencyUnit(stellarUnit, `${value}`);
};

export default {
  getBalanceFromAccount: (accountResponse: AccountResponse) => {
    let balance = new BigNumber(0);

    if (Array.isArray(accountResponse.balances) && accountResponse.balances.length > 0) {
      const nativeBalance = accountResponse.balances.find(
        b => b.asset_type === "native"
      );
      if (nativeBalance) {
        balance = parseCurrencyUnit(stellarUnit, `${nativeBalance.balance}`);
      }
    }
    return balance;
  },
  getLastLedger: async () => {
    return await getServer()
      .ledgers()
      .limit(1)
      .order("desc")
      .call();
  },
  getServer
};
