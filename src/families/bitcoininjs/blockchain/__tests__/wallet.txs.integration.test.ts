import Storage from "../storage/mock";
import Explorer from "../explorer/ledger.v3.2.4";
import Crypto from "../crypto/bitcoin";
import Xpub from "../xpub";
import * as bip32 from "bip32";
import * as bip39 from "bip39";
import coininfo from "coininfo";
import axios from "axios";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe.skip("testing legacy transactions", () => {
  let explorer = new Explorer({
    explorerURI: "http://localhost:20000/blockchain/v3",
  });
  let crypto = new Crypto({
    network: coininfo.bitcoin.main.toBitcoinJS(),
  });
  let storage = new Storage();
  const seed1 = bip39.mnemonicToSeedSync("test test test");
  const node1 = bip32.fromSeed(seed1);
  let xpub1 = new Xpub({
    storage,
    explorer,
    crypto,
    xpub: node1.neutered().toBase58(),
    derivationMode: "Legacy",
  });
  const seed2 = bip39.mnemonicToSeedSync("test2 test2 test2");
  const node2 = bip32.fromSeed(seed2);
  let xpub2 = new Xpub({
    storage,
    explorer,
    crypto,
    xpub: node2.neutered().toBase58(),
    derivationMode: "Legacy",
  });

  beforeAll(async () => {
    const address = await xpub1.getNewAddress(0, 0);

    try {
      await axios.post("http://localhost:28443/chain/clear/all");
      await axios.post(`http://localhost:28443/chain/mine/${address}/1`);
      await axios.post(`http://localhost:28443/chain/faucet/${address}/7.0`);
    } catch (e) {
      console.log("praline setup error", e);
    }

    // time for explorer to sync
    await sleep(20000);

    try {
      await xpub1.sync();
    } catch(e) {
      console.log("praline explorer setup error", e);
    }
  }, 25000);

  it("should be setup correctly", async () => {
    const balance1 = await xpub1.getXpubBalance();

    expect(balance1).toEqual(57);
  });
});
