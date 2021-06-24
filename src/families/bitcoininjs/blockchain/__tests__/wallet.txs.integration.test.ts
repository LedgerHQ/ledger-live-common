import Storage from "../storage/mock";
import Explorer from "../explorer/ledger.v3.2.4";
import Crypto from "../crypto/bitcoin";
import Xpub from "../xpub";
import * as bip32 from "bip32";
import * as bip39 from "bip39";
import * as bitcoin from "bitcoinjs-lib";
import coininfo from "coininfo";
import axios from "axios";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe("testing legacy transactions", () => {
  const network = coininfo.bitcoin.test.toBitcoinJS();

  let explorer = new Explorer({
    explorerURI: "http://localhost:20000/blockchain/v3",
    disableBatchSize: true, // https://ledgerhq.atlassian.net/browse/BACK-2191
  });
  let crypto = new Crypto({
    network,
  });

  let storage1 = new Storage();
  const seed1 = bip39.mnemonicToSeedSync("test test test");
  const node1 = bip32.fromSeed(seed1, network);
  const pk1 = bitcoin.ECPair.fromWIF(node1.toWIF(), network);
  let xpub1 = new Xpub({
    storage: storage1,
    explorer,
    crypto,
    xpub: node1.neutered().toBase58(),
    derivationMode: "Legacy",
  });

  let storage2 = new Storage();
  const seed2 = bip39.mnemonicToSeedSync("test2 test2 test2");
  const node2 = bip32.fromSeed(seed2, network);
  const pk2 = bitcoin.ECPair.fromWIF(node2.toWIF(), network);
  let xpub2 = new Xpub({
    storage: storage2,
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

    expect(balance1).toEqual(5700000000);
  });

  it("should send a 1 btc tx to xpub2", async () => {
    const address = await xpub2.getNewAddress(0, 0);

    const psbt = await xpub1.buildTx(
      {
        account: 0,
      },
      {
        account: 1,
        gap: 1,
      },
      address,
      100000000,
      500
    );

    psbt.signInput(0, pk1);
    psbt.validateSignaturesOfInput(0);

    expect(psbt.extractTransaction().toHex()).toEqual(
      "70736274ff0100a0020000000228a84c2a5da72e3715f58b72533c5341d069847fd0e6849c68688eddec6ebe8a0000000000ffffffff80c410c8c38706595a7fbce999a89267e0cad21a22dbe898067c9a4a474544a20000000000ffffffff02e8030000000000001976a91499bc78ba577a95a11f1a344d4d2ae55f2f857b9888ac9c000000000000001976a914791c175192c35c3d82bd45ba5061e821787cd0f488ac00000000000100e2010000000148e83f12d7b50ff2c9dcc017c6872c7060910ebfc92be1f88a5438a48285718f010000006b483045022100c0d25c75085351ea6770443e60401b6e1423e8e15a6cf6171e25ba9488fbca9a0220188b9bcbd8c54f6f6730f7c6c11129c07158d8c7dc864268b399b87d7111c4890121026f560780537aac265f844d1c265c6b4f5cf6a11ca16bab430346b2e91c4c29efffffffff0290020000000000001976a91439ecab95ada04b8aea16e1ea6c21ca5e0c6d82ab88ac925b0000000000001976a914d44769704178708b59ace41a47396b0f0133e84288ac00000000000100e202000000000101c047ac8e2a6cfb9e359ee786f028446abad021a840e394a010307dd9fe3a74710100000000feffffff02e8030000000000001976a914d2c1fe5c55a1e9d818149750f2662ba57748247088ac980516000000000016001476ec0266944fd21984f8142fdbdae04c16d5032602483045022100e30e7fbb23205836c33f87c028e2f73c1874fcb29e5a28244fa376420a4e6d2d022063796b1dde59686068dc97377b64db14e2acb9fab2c0ca3f5b154ee34410bb8401210379bef8204e430a6fc5160b9273b00c00f7095fd38f2b3bb58a6ba7647621b881331a0900000000"
    );
  });
});
