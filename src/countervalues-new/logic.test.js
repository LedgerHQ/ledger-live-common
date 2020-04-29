// @flow
import "../__tests__/test-helpers/staticTime";
import { initialState, loadCountervalues, calculate } from "./logic";
import { setEnv } from "../env";
import { getFiatCurrencyByTicker, getCryptoCurrencyById } from "../currencies";

setEnv("MOCK", "1");

test("mock load with nothing to track", async () => {
  const state = await loadCountervalues(initialState, {
    trackingPairs: []
  });
  expect(state).toBeDefined();
  expect(
    calculate(state, {
      value: 100000000,
      from: getCryptoCurrencyById("bitcoin"),
      to: getFiatCurrencyByTicker("USD")
    })
  ).toBeUndefined();
});

test("mock load with btc-usd to track", async () => {
  const state = await loadCountervalues(initialState, {
    trackingPairs: [
      {
        from: "BTC",
        to: "USD",
        startDate: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000)
      }
    ]
  });
  expect(state).toBeDefined();
  expect(
    calculate(state, {
      value: 100000000,
      from: getCryptoCurrencyById("bitcoin"),
      to: getFiatCurrencyByTicker("USD"),
      date: new Date(Date.now() - 210 * 24 * 60 * 60 * 1000)
    })
  ).toBeUndefined();
  expect(
    calculate(state, {
      value: 100000000,
      from: getCryptoCurrencyById("bitcoin"),
      to: getFiatCurrencyByTicker("USD")
    })
  ).toBe(261944);
  expect(
    calculate(state, {
      value: 10000000,
      from: getCryptoCurrencyById("bitcoin"),
      to: getFiatCurrencyByTicker("USD")
    })
  ).toBe(26194);
  expect(
    calculate(state, {
      value: 100000000,
      from: getCryptoCurrencyById("bitcoin"),
      to: getFiatCurrencyByTicker("EUR")
    })
  ).toBeUndefined();
});

// TODO test the incremental aspect of loadCountervalues