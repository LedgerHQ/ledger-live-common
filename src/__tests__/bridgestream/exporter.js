// @flow
import { makeFrames } from "../../bridgestream/exporter";
import { genAccount } from "../../mock/account";

test("basic export", () => {
  const accounts = Array(3)
    .fill(null)
    .map((_, i) => genAccount("export_" + i));
  const arg = {
    accounts,
    settings: {
      currenciesSettings: {
        bitcoin: {
          exchange: "KRAKEN"
        }
      }
    },
    exporterName: "test",
    exporterVersion: "0.0.0",
    chunkSize: 100
  };
  const chunks = makeFrames(arg);
  expect(chunks).toMatchSnapshot();
});
