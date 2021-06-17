import Storage from "../storage/orderedmemorylist";
import Explorer from "../explorer/ledger.v3.2.4";
import Derivation from "../derivation/bitcoin";
import Wallet from "../wallet";
import path from "path";
import coininfo from "coininfo";
import { toMatchFile } from "jest-file-snapshot";

const startLogging = (emitters) => {
  emitters.forEach((emitter) =>
    emitter.emitter.on(emitter.event, (...args) =>
      console.log(JSON.stringify(args, null, 2))
    )
  );
};
const stopLogging = (emitters) => {
  emitters.forEach((emitter) => emitter.removeAllListeners());
};

expect.extend({ toMatchFile });

describe("integration sync bitcoin mainnet / ledger explorer / mock storage", () => {
  let storage = new Storage();
  let explorer = new Explorer({
    explorerURI: "https://explorers.api.vault.ledger.com/blockchain/v3/btc",
  });
  let derivation = new Derivation({
    network: coininfo.bitcoin.main.toBitcoinJS(),
  });

  const xpubs = [
    "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz", // 5sec
    "xpub6D4waFVPfPCpRvPkQd9A6n65z3hTp6TvkjnBHG5j2MCKytMuadKgfTUHqwRH77GQqCKTTsUXSZzGYxMGpWpJBdYAYVH75x7yMnwJvra1BUJ",
  ];

  xpubs.forEach((xpub) =>
    describe(`xpub ${xpub}`, () => {
      let wallet = new Wallet({
        storage,
        explorer,
        derivation,
        xpub,
      });

      beforeAll(() => {
        startLogging([
          { emitter: wallet, event: "address-syncing" },
          { emitter: explorer, event: null },
        ]);
      });
      afterAll(() => {
        stopLogging([wallet, explorer]);
      });

      it(
        "should sync from zero correctly",
        async () => {
          await wallet.sync();

          const truthDump = path.join(
            __dirname,
            "data",
            "sync",
            `${xpub}.json`
          );

          expect(await storage.toString()).toMatchFile(truthDump);
        },
        // 1 min but should take less than 5s
        5 * 60 * 1000
      );
    })
  );
});
