// @flow
import axios from "axios";
import { initialState, loadCountervalues, calculate } from "./logic";
import { getFiatCurrencyByTicker, getCryptoCurrencyById } from "../currencies";

const bitcoin = getCryptoCurrencyById("bitcoin");
const usd = getFiatCurrencyByTicker("USD");
const now = Date.now();

let shouldStopNetwork = false;
axios.interceptors.request.use((r) => {
  if (shouldStopNetwork) throw new Error("stopping http query");
  return r;
});

afterEach(() => {
  shouldStopNetwork = false;
});

describe("API sanity", () => {
  test("recent days have rate for BTC USD", async () => {
    const userSettings = {
      trackingPairs: [
        {
          from: bitcoin,
          to: usd,
          startDate: new Date(now - 200 * 24 * 60 * 60 * 1000),
        },
      ],
      autofillGaps: false,
    };
    let state = await loadCountervalues(initialState, userSettings);
    for (let i = 0; i < 7; i++) {
      const value = calculate(state, {
        date: new Date(now - i * 24 * 60 * 60 * 1000),
        disableRounding: true,
        from: bitcoin,
        to: usd,
        value: 1000000,
      });
      expect(value).toBeDefined();
    }
    expect(
      calculate(state, { from: bitcoin, to: usd, value: 10000000 })
    ).toBeGreaterThan(1000);
    shouldStopNetwork = true;
    state = await loadCountervalues(state, userSettings);
    expect(
      calculate(state, { from: bitcoin, to: usd, value: 10000000 })
    ).toBeGreaterThan(1000);
  });
  test("recent days have different rates for BTC USD", async () => {
    const state = await loadCountervalues(initialState, {
      trackingPairs: [
        {
          from: bitcoin,
          to: usd,
          startDate: new Date(now - 200 * 24 * 60 * 60 * 1000),
        },
      ],
      autofillGaps: true,
    });
    let currentValue = calculate(state, {
      disableRounding: true,
      from: bitcoin,
      to: usd,
      value: 1000000,
    });
    for (let i = 1; i < 7; i++) {
      const value = calculate(state, {
        date: new Date(now - i * 24 * 60 * 60 * 1000),
        disableRounding: true,
        from: bitcoin,
        to: usd,
        value: 1000000,
      });
      expect(value).not.toEqual(currentValue);
    }
  });
});
