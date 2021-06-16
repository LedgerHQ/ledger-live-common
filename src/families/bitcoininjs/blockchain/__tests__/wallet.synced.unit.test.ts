import Storage from "../storage/mock";
import Explorer from "../explorer/mock";
import Derivation from "../derivation/bitcoin";
import Wallet from "../wallet";
import path from "path";
import coininfo from "coininfo";

describe("synced wallet utilites functions", () => {
  let storage = new Storage();
  let explorer = new Explorer();
  let derivation = new Derivation({
    network: coininfo.bitcoin.main.toBitcoinJS(),
  });

  describe("xpub xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz", () => {
    let xpub =
      "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz";
    let truthDump = path.join(__dirname, "data", "sync", `${xpub}.json`);
    let wallet = new Wallet({
      storage,
      explorer,
      derivation,
      xpub,
    });

    beforeAll(() => {
      storage.load(truthDump);
    });

    it("should compute accounts/addresses correctly", async () => {
      expect((await wallet.getWalletAddresses()).length).toEqual(15);

      expect(
        (await wallet.getDerivationModeAddresses("Legacy")).length
      ).toEqual(15);
      expect((await wallet.getDerivationModeAccounts("Legacy")).length).toEqual(
        1
      );
      expect((await wallet.getAccountAddresses("Legacy", 0)).length).toEqual(
        15
      );

      expect(
        (await wallet.getDerivationModeAddresses("Native SegWit")).length
      ).toEqual(0);

      expect(
        (await wallet.getDerivationModeAddresses("SegWit")).length
      ).toEqual(0);
    });
  });
});
