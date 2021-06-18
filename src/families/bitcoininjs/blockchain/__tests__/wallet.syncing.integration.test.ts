import Storage from "../storage/mock";
import Explorer from "../explorer/ledger.v3.2.4";
import Crypto from "../crypto/bitcoin";
import Wallet from "../wallet";
import path from "path";
import coininfo from "coininfo";
import { toMatchFile } from "jest-file-snapshot";
import { orderBy } from "lodash";

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
  let explorer = new Explorer({
    explorerURI: "https://explorers.api.vault.ledger.com/blockchain/v3/btc",
  });
  let crypto = new Crypto({
    network: coininfo.bitcoin.main.toBitcoinJS(),
  });

  const xpubs = [
    {
      xpub:
        "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz", // 3000ms
      addresses: 15,
      balance: 12678243,
    },
    {
      xpub:
        "xpub6D4waFVPfPCpRvPkQd9A6n65z3hTp6TvkjnBHG5j2MCKytMuadKgfTUHqwRH77GQqCKTTsUXSZzGYxMGpWpJBdYAYVH75x7yMnwJvra1BUJ", // 5400ms
      addresses: 506,
      balance: 166505122,
    },
    {
      xpub:
        "xpub6CThYZbX4PTeA7KRYZ8YXP3F6HwT2eVKPQap3Avieds3p1eos35UzSsJtTbJ3vQ8d3fjRwk4bCEz4m4H6mkFW49q29ZZ6gS8tvahs4WCZ9X", // 138sec,
      addresses: 9741,
      balance: 0,
    },
  ];

  xpubs.forEach((xpub) =>
    describe(`xpub ${xpub.xpub}`, () => {
      let storage = new Storage();
      let wallet = new Wallet({
        storage,
        explorer,
        crypto,
        xpub: xpub.xpub,
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
            `${xpub.xpub}.json`
          );

          expect(
            await storage.toString((txs) =>
              orderBy(txs, [
                "derivationMode",
                "account",
                "index",
                "block.height",
                "id",
              ])
            )
          ).toMatchFile(truthDump);
          expect(await wallet.getWalletBalance()).toEqual(xpub.balance);
          const addresses = await wallet.getWalletAddresses();
          expect(addresses.length).toEqual(xpub.addresses);
        },
        // github so slow
        15 * 60 * 1000
      );
    })
  );
});
