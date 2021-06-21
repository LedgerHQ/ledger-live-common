import Storage from "../storage/mock";
import Explorer from "../explorer/ledger.v3.2.4";
import Crypto from "../crypto/bitcoin";
import Wallet from "../wallet";
import path from "path";
import coininfo from "coininfo";
import { zipObject } from "lodash";

describe("synced wallet utilites functions", () => {
  let explorer = new Explorer({
    explorerURI: "https://explorers.api.vault.ledger.com/blockchain/v3/btc",
  });
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

      expect(tx.toHex()).toEqual(
        "70736274ff0100a0020000000228a84c2a5da72e3715f58b72533c5341d069847fd0e6849c68688eddec6ebe8a0000000000ffffffff80c410c8c38706595a7fbce999a89267e0cad21a22dbe898067c9a4a474544a20000000000ffffffff02e8030000000000001976a91499bc78ba577a95a11f1a344d4d2ae55f2f857b9888ac9c000000000000001976a914186ced61f346a5926b49b5c437164e74d0ba306d88ac00000000000100e2010000000148e83f12d7b50ff2c9dcc017c6872c7060910ebfc92be1f88a5438a48285718f010000006b483045022100c0d25c75085351ea6770443e60401b6e1423e8e15a6cf6171e25ba9488fbca9a0220188b9bcbd8c54f6f6730f7c6c11129c07158d8c7dc864268b399b87d7111c4890121026f560780537aac265f844d1c265c6b4f5cf6a11ca16bab430346b2e91c4c29efffffffff0290020000000000001976a91439ecab95ada04b8aea16e1ea6c21ca5e0c6d82ab88ac925b0000000000001976a914d44769704178708b59ace41a47396b0f0133e84288ac00000000000100e202000000000101c047ac8e2a6cfb9e359ee786f028446abad021a840e394a010307dd9fe3a74710100000000feffffff02e8030000000000001976a914d2c1fe5c55a1e9d818149750f2662ba57748247088ac980516000000000016001476ec0266944fd21984f8142fdbdae04c16d5032602483045022100e30e7fbb23205836c33f87c028e2f73c1874fcb29e5a28244fa376420a4e6d2d022063796b1dde59686068dc97377b64db14e2acb9fab2c0ca3f5b154ee34410bb8401210379bef8204e430a6fc5160b9273b00c00f7095fd38f2b3bb58a6ba7647621b881331a0900000000"
      );
    });
  });
});
