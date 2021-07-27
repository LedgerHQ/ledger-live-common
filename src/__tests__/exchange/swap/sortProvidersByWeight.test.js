// @flow
import sortProvidersByWeight from "../../../exchange/swap/sortProvidersByWeight";
import type { AvailableProvider } from "../../../exchange/swap/types";

jest.mock("../../../exchange/swap/providersPriority", () => ({
  changelly: 1,
  kraken: -1,
}));

describe("swap/sortProvidersByWeight", () => {
  let providers: Array<AvailableProvider>;

  beforeEach(() => {
    const mockedPairs = [{ from: "ETH", to: "USD", tradeMethod: "float" }];

    providers = [
      { provider: "bitstamp", pairs: mockedPairs },
      { provider: "changelly", pairs: mockedPairs },
      { provider: "kraken", pairs: mockedPairs },
      { provider: "bitfinex", pairs: mockedPairs },
      { provider: "bitbay", pairs: mockedPairs },
    ];
  });

  test("changelly is sorted as the first provider", () => {
    const sortedProviders = providers.sort(sortProvidersByWeight);
    const changellyIndex = sortedProviders.findIndex(
      ({ provider }) => provider === "changelly"
    );
    expect(changellyIndex).toBe(0);
  });

  test("kraken is sorted as the last provider", () => {
    const sortedProviders = providers.sort(sortProvidersByWeight);
    const krakenIndex = sortedProviders.findIndex(
      ({ provider }) => provider === "kraken"
    );
    expect(krakenIndex).toBe(sortedProviders.length - 1);
  });
});
