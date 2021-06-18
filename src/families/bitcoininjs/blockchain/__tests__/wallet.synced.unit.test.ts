import Storage from "../storage/mock";
import Explorer from "../explorer/mock";
import Crypto from "../crypto/bitcoin";
import Wallet from "../wallet";
import path from "path";
import coininfo from "coininfo";
import { zipObject } from "lodash";

describe("synced wallet utilites functions", () => {
  let explorer = new Explorer();
  let crypto = new Crypto({
    network: coininfo.bitcoin.main.toBitcoinJS(),
  });

  describe("xpub xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz", () => {
    let xpub =
      "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz";
    let truthDump = path.join(__dirname, "data", "sync", `${xpub}.json`);
    let storage = new Storage();
    let wallet = new Wallet({
      storage,
      explorer,
      crypto,
      xpub,
    });

    beforeAll(() => {
      storage.load(truthDump);
    });

    it("should compute accounts/addresses/balances correctly", async () => {
      const addresses = await wallet.getWalletAddresses();
      expect(addresses.length).toEqual(15);

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

      expect(await wallet.getWalletBalance()).toEqual(12678243);
      expect(await wallet.getDerivationModeBalance("Legacy")).toEqual(12678243);
      expect(await wallet.getAccountBalance("Legacy", 0)).toEqual(12678243);
      const addressesBalances = await Promise.all(
        addresses.map((address) => wallet.getAddressBalance(address))
      );
      expect(
        zipObject(
          addresses.map((address) => address.address),
          addressesBalances
        )
      ).toEqual({
        "12iNxzdF6KFZ14UyRTYCRuptxkKSSVHzqF": 0,
        "15NvG6YpVh2aUc3DroVttEcWa1Z99qhACP": 1000,
        "15xANZb5vJv5RGL263NFuh8UGgHT7noXeZ": 100000,
        "1687EJf5YEmeEtcscnuJPiV5b8HkM1o98q": 40160,
        "16HH35ASv5rL8ZaaqdzvrJKTAKTucdKKNP": 656,
        "16ZBYSHkLkRFHAuZvyzosXYgU1UDJxRV1R": 100000,
        "1Ahipz531XtbzGC1bEKbhHZXmyfWKPNy32": 1000,
        "1CcEugXu9Yf9Qw5cpB8gHUK4X9683WyghM": 8747,
        "1EHeVKfjjq6FJpix86G2yzFeRbZ6RNg2Zm": 100000,
        "1EfgV2Hr5CDjXPavHDpDMjmU33BA2veHy6": 0,
        "1HqsYkwczwvkMXCobk5WPZmhj2S2TK613Z": 40161,
        "1KhVznhEQHumfmMQWnkgXLT4BmvtNpwLN9": 12183719,
        "1LDPJCMZhYZjTvTGYahdhMXLuMfjfi6Kua": 1000,
        "1MS6eGqD4iUGyJPbEsjqmoNaRhApgtmF8J": 1800,
        "1PJMBXKBYEBMRDmpAoBRbDff26gHJrawSp": 100000,
      });
    });

    it("should build a tx", async () => {
      const tx = await wallet.buildTx(
        {
          derivationMode: "Legacy",
          account: 0,
        },
        {
          derivationMode: "Legacy",
          account: 0,
          randomGapToUse: 3,
        },
        "1F1tAaz5x1HUXrCNLbtMDqcw6o5GNn4xqX",
        1000,
        500
      );

      expect(tx).toEqual(
        "cHNidP8BAKACAAAAAiioTCpdpy43FfWLclM8U0HQaYR/0OaEnGhojt3sbr6KAAAAAAD/////gMQQyMOHBllaf7zpmaiSZ+DK0hoi2+iYBnyaSkdFRKIAAAAAAP////8C6AMAAAAAAAAZdqkUmbx4uld6laEfGjRNTSrlXy+Fe5iIrJwAAAAAAAAAGXapFBhs7WHzRqWSa0m1xDcWTnTQujBtiKwAAAAAAAAAAAA="
      );
    });
  });
});
