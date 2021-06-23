import Storage from "../storage/mock";
import Explorer from "../explorer/mock";
import Crypto from "../crypto/bitcoin";
import Xpub from "../xpub";
import path from "path";
import coininfo from "coininfo";
import { zipObject } from "lodash";

describe("synced wallet utilites functions", () => {
  let explorer = new Explorer();
  let crypto = new Crypto({
    network: coininfo.bitcoin.main.toBitcoinJS(),
  });

  describe("xpub xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz Legacy", () => {
    let xpubraw =
      "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz";
    let truthDump = path.join(__dirname, "data", "sync", `${xpubraw}.json`);
    let storage = new Storage();
    let xpub = new Xpub({
      storage,
      explorer,
      crypto,
      xpub: xpubraw,
      derivationMode: "Legacy",
    });

    beforeAll(() => {
      storage.load(truthDump);
    });

    it("should compute accounts/addresses/balances correctly", async () => {
      const addresses = await xpub.getXpubAddresses();
      expect(addresses.length).toEqual(15);

      expect((await xpub.getAccountAddresses(0)).length).toEqual(15);

      expect(await xpub.getXpubBalance()).toEqual(12678243);
      expect(await xpub.getAccountBalance(0)).toEqual(12678243);
      const addressesBalances = await Promise.all(
        addresses.map((address) => xpub.getAddressBalance(address))
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
  });
});
