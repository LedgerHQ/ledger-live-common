// @flow
import { makeFrames } from "../../bridgestream/exporter";
import shuffle from "lodash/shuffle";
import { decodeFrames } from "../../bridgestream/importer";
import {
  areFramesComplete,
  parseFramesReducer,
  currentNumberOfFrames
} from "../../qrstream/importer";
import { genAccount } from "../../mock/account";

test("import", () => {
  const accounts = Array(3)
    .fill(null)
    .map((_, i) => genAccount("export_" + i));
  const arg = {
    accounts,
    settings: {
      counterValue: "USD",
      counterValueExchange: "KRAKEN",
      currenciesSettings: {
        bitcoin: {
          exchange: "KRAKEN"
        }
      }
    },
    exporterName: "test",
    exporterVersion: "0.0.0",
    chunkSize: 100,
    variants: 1
  };
  const frames = makeFrames(arg);

  let data = [];
  shuffle(frames).forEach((chunk, i) => {
    expect(areFramesComplete(data)).toBe(false);
    data = parseFramesReducer(data, chunk, console);
    expect(currentNumberOfFrames(data)).toBe(i + 1);
    data = parseFramesReducer(data, chunk, console);
    expect(currentNumberOfFrames(data)).toBe(i + 1); // chunk already existed
  });
  expect(areFramesComplete(data)).toBe(true);
  const res = decodeFrames(data);
  expect(res.accounts).toMatchObject(
    accounts.map(a => ({
      balance: a.balance.toString(),
      currencyId: a.currency.id,
      id: a.id,
      name: a.name,
      index: a.index
    }))
  );
  expect(res.settings).toMatchObject({
    counterValue: "USD",
    counterValueExchange: "KRAKEN",
    currenciesSettings: {
      bitcoin: {
        exchange: "KRAKEN"
      }
    }
  });
  expect(res).toMatchSnapshot();
});
