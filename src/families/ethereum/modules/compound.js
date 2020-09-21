// @flow

// FIXME there are two tradeoffs and problems to solve
// - first of all, compound api is not that fast and we are not optimized by pulling for each trade
// - secondly, we need to implement the "historical over time" changes.
// IDEA: to me we need to reborn the idea that we will pull daily rates and just stick to it (even if it means some approximation)

import URL from "url";
import { BigNumber } from "bignumber.js";
import uniqBy from "lodash/uniqBy";
import values from "lodash/values";
import type {
  TokenAccount,
  CryptoCurrency,
  TokenCurrency,
  OperationType,
} from "../../../types";
import type { ModeModule } from "../types";
import { listTokensForCryptoCurrency, getTokenById } from "../../../currencies";
import network from "../../../network";
import { promiseAllBatched } from "../../../promise";
import { getEnv } from "../../../env";

export type Modes =
  | "compound.mint"
  | "compound.redeem"
  | "compound.redeemUnderlying";

export const modes: { [_: Modes]: ModeModule } = {};

// TODO: NB: this needs to be serializable
type CompoundPreloaded = {};

let compoundPreloadedValue: CompoundPreloaded = {
  // this is the not loaded state, it will be filled by hydrate
};

// FIXME: if the current rate is needed at global level, we should consider having it in preload() stuff
// NB we might want to preload at each sync too.
// if that's the case we need to see how to implement this in bridge cycle.
// => allow to define strategy to reload preload()
export function preload(): Promise<CompoundPreloaded> {
  return Promise.resolve({});
}

export function hydrate(value: CompoundPreloaded) {
  compoundPreloadedValue = value;
  console.warn("NOT USED yet", compoundPreloadedValue);
}

export function prepareTokenAccounts(
  currency: CryptoCurrency,
  subAccounts: TokenAccount[]
): TokenAccount[] {
  if (currency.id !== "ethereum" || !getEnv("COMPOUND")) return subAccounts;

  const compoundByTokenId = inferSubAccountsCompound(currency, subAccounts);

  // add implicitly all ctoken account when a token account exists so we can fetch the balance again
  const implicitCTokenAccounts = values(compoundByTokenId)
    .map(({ tokenAccount, ctokenAccount, ctoken }): ?TokenAccount =>
      tokenAccount && !ctokenAccount
        ? // TODO reuse generateTokenAccount
          {
            // this is a placeholder that will be dropped by digestTokenAccounts
            type: "TokenAccount",
            id: "empty_" + ctoken.id,
            token: ctoken,
            parentId: "",
            balance: BigNumber(0),
            spendableBalance: BigNumber(0),
            creationDate: new Date(),
            operationsCount: 0,
            operations: [],
            pendingOperations: [],
            starred: false,
            swapHistory: [],
          }
        : null
    )
    .filter(Boolean);

  if (implicitCTokenAccounts.length === 0) return subAccounts;

  return subAccounts.concat(implicitCTokenAccounts);
}

const cdaiToDaiOpMapping: { [_: OperationType]: ?OperationType } = {
  IN: "SUPPLY",
  OUT: "REDEEM",
};

export async function digestTokenAccounts(
  currency: CryptoCurrency,
  subAccounts: TokenAccount[]
): Promise<TokenAccount[]> {
  if (currency.id !== "ethereum" || !getEnv("COMPOUND")) return subAccounts;

  const compoundByTokenId = inferSubAccountsCompound(currency, subAccounts);
  if (Object.keys(compoundByTokenId).length === 0) return subAccounts;

  const ctokensWithBalance = values(compoundByTokenId)
    .filter(
      (c) => c.tokenAccount && c.ctokenAccount && c.tokenAccount.balance.gt(0)
    )
    .map((c) => c.ctoken);

  const latestRates = await fetchCurrentRates(ctokensWithBalance);

  // TODO:
  // for each C* tokens when both C* and * exists:
  // - merge the C* ops in * and dedup
  // - fetch rates of the new C* ops that was not yet digested
  // - fetch current rate
  // - make the balance adding up C* and * rates + availableBalance
  // - add extra operation to reflect the C* ones
  // - remove the C*
  const all = await promiseAllBatched(2, subAccounts, async (a) => {
    // C* tokens are digested by the related ERC20 account so they completely disappear for the user
    const { compoundFor } = a.token;
    if (compoundFor) {
      // however, if the related ERC20 account would not exist, we would allow its display
      if (!compoundByTokenId[compoundFor]) {
        return a;
      }
      return;
    }

    const maybeCompound = compoundByTokenId[a.token.id];
    if (maybeCompound) {
      // digest the C* account
      const { ctoken, ctokenAccount } = maybeCompound;
      if (ctokenAccount) {
        // balance = balance + rate * cbalance
        let balance = a.balance;
        let spendableBalance = a.balance;
        const latestRate = latestRates.find((r) => r.token === ctoken);
        if (latestRate) {
          balance = balance.plus(
            ctokenAccount.balance.times(latestRate.rate).integerValue()
          );
        }

        // operations, C* to * conversions with the historical rates
        // cIN => SUPPLY
        // cOUT => REDEEM
        const rates = await fetchHistoricalRates(
          ctoken,
          ctokenAccount.operations.map((op) => op.date)
        );

        const newOps = ctokenAccount.operations
          .map((op, i) => {
            const { rate } = rates[i];
            const value = op.value.times(rate).integerValue();
            const type = cdaiToDaiOpMapping[op.type];
            if (!type) return;
            return {
              ...op,
              id: `${a.id}-${op.hash}-${type}`,
              type,
              value,
              accountId: a.id,
              extra: { compoundValue: op.value, rate: rate.toString() },
            };
          })
          .filter(Boolean);

        // TODO: for perf, we can be a slightly more conservative and keep refs as much as possible to not have a ref changes above
        return {
          ...a,
          spendableBalance,
          balance,
          operations: mergeOps(a.operations, newOps),
        };
      }
    }
    return a;
  });

  return all.filter(Boolean);
}

const API_BASE = `https://api.compound.finance/api/v2`;

const fetch = (path, query = {}) =>
  network({
    type: "get",
    url: URL.format({
      pathname: `${API_BASE}${path}`,
      query,
    }),
  });

type Rate = {
  token: TokenCurrency,
  rate: BigNumber,
};

async function fetchCurrentRates(tokens): Promise<Rate[]> {
  if (tokens.length === 0) return [];
  const { data } = await fetch("/ctoken", {
    block_timestamp: 0,
    addresses: tokens.map((c) => c.contractAddress).join(","),
  });
  return tokens.map((token) => {
    const cToken = data.cToken.find(
      (ct) =>
        ct.token_address.toLowerCase() === token.contractAddress.toLowerCase()
    );
    if (!cToken) return { token, rate: BigNumber("0") };
    const rawRate = cToken.exchange_rate.value;
    const otoken = getTokenById(token.compoundFor || "");
    const magnitudeRatio = BigNumber(10).pow(
      otoken.units[0].magnitude - token.units[0].magnitude
    );
    const rate = BigNumber(rawRate).times(magnitudeRatio);
    return {
      token,
      rate,
    };
  });
}

async function fetchHistoricalRates(token, dates: Date[]): Promise<Rate[]> {
  const all = await promiseAllBatched(3, dates, async (date) => {
    const { data } = await fetch("/ctoken", {
      block_timestamp: Math.round(date.getTime() / 1000),
      addresses: [token.contractAddress],
    });
    const cToken = data.cToken.find(
      (ct) =>
        ct.token_address.toLowerCase() === token.contractAddress.toLowerCase()
    );
    if (!cToken) return { token, rate: BigNumber("0") };
    const rawRate = cToken.exchange_rate.value;
    const otoken = getTokenById(token.compoundFor || "");
    const magnitudeRatio = BigNumber(10).pow(
      otoken.units[0].magnitude - token.units[0].magnitude
    );
    const rate = BigNumber(rawRate).times(magnitudeRatio);
    return {
      token,
      rate,
    };
  });
  return all;
}

// TODO way to optimize this?
function mergeOps(existing, newFetched) {
  if (newFetched.length === 0) return existing;
  const ids = existing.map((o) => o.id);
  const all = newFetched.filter((o) => !ids.includes(o.id)).concat(existing);
  return uniqBy(
    all.sort((a, b) => b.date - a.date),
    "id"
  );
}

function inferSubAccountsCompound(currency, subAccounts) {
  const compoundByTokenId: {
    [_: string]: ?{
      tokenAccount: ?TokenAccount,
      token: TokenCurrency,
      ctoken: TokenCurrency,
      ctokenAccount: ?TokenAccount,
    },
  } = {};
  listTokensForCryptoCurrency(currency, { withDelisted: true }).forEach(
    (ctoken) => {
      const { compoundFor } = ctoken;
      if (compoundFor) {
        const tokenAccount = subAccounts.find(
          (a) => a.token.id === compoundFor
        );
        const ctokenAccount = subAccounts.find((a) => a.token === ctoken);
        if (!tokenAccount && !ctokenAccount) return;
        const token = getTokenById(compoundFor);
        compoundByTokenId[compoundFor] = {
          tokenAccount,
          token,
          ctoken,
          ctokenAccount,
        };
      }
    }
  );
  return compoundByTokenId;
}
