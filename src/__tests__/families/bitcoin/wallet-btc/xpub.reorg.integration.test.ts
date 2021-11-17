import axios from "axios";
import BIP32Factory from "bip32";
import * as bip39 from "bip39";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import coininfo from "coininfo";
import { ECPair } from "ecpair";
import * as ecc from "tiny-secp256k1";
import Crypto from "../../../../families/bitcoin/wallet-btc/crypto/bitcoin";
import Explorer from "../../../../families/bitcoin/wallet-btc/explorer";
import BitcoinLikeStorage from "../../../../families/bitcoin/wallet-btc/storage";
import { DerivationModes } from "../../../../families/bitcoin/wallet-btc/types";
import Xpub from "../../../../families/bitcoin/wallet-btc/xpub";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const bip32 = BIP32Factory(ecc)
// FIXME Skipped because Praline required on CI
describe.skip("testing xpub reorg management", () => {
  const network = coininfo.bitcoin.test.toBitcoinJS();

  const explorer = new Explorer({
    explorerURI: "http://localhost:20000/blockchain/v3",
    explorerVersion: "v3",
    disableBatchSize: true, // https://ledgerhq.atlassian.net/browse/BACK-2191
  });
  const crypto = new Crypto({
    network,
  });

  const xpubs = [1].map((i) => {
    const storage = new BitcoinLikeStorage();
    const seed = bip39.mnemonicToSeedSync(`test${i} test${i} test${i}`);
    const node = bip32.fromSeed(seed, network);
    const signer = (account: number, index: number) =>
      ECPair.fromPrivateKey(node.derive(account).derive(index).privateKey!);

    const xpub = new Xpub({
      storage,
      explorer,
      crypto,
      xpub: node.neutered().toBase58(),
      derivationMode: DerivationModes.LEGACY,
    });

    return {
      storage,
      seed,
      node,
      signer,
      xpub,
    };
  });

  beforeAll(async () => {
    const { address } = await xpubs[0].xpub.getNewAddress(0, 0);

    try {
      await axios.post("http://localhost:28443/chain/clear/all");
      await axios.post(`http://localhost:28443/chain/mine/${address}/1`);
      await axios.post(`http://localhost:28443/chain/faucet/${address}/7.0`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log("praline setup error", e);
      throw e;
    }

    // time for explorer to sync
    await sleep(80000);

    try {
      await xpubs[0].xpub.sync();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log("praline explorer setup error", e);
      throw e;
    }
  }, 160000);

  it("should be setup correctly", async () => {
    const balance1 = await xpubs[0].xpub.getXpubBalance();

    expect(balance1.toNumber()).toEqual(5700000000);
  });

  it("should show 7btc balance now", async () => {
    const { address } = await xpubs[0].xpub.getNewAddress(0, 0);

    try {
      await axios.post("http://localhost:28443/chain/clear/all");
      await axios.post(
        `http://localhost:28443/chain/mine/2N1MYgVbjLgveWPSicdScTAsYSDYEzyg7vd/1`
      );
      await axios.post(`http://localhost:28443/chain/faucet/${address}/7.0`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log("praline setup error", e);
      throw e;
    }

    // time for explorer to sync
    await sleep(80000);

    try {
      await xpubs[0].xpub.sync();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log("praline explorer setup error", e);
      throw e;
    }

    const balance1 = await xpubs[0].xpub.getXpubBalance();
    expect(balance1.toNumber()).toEqual(700000000);
  }, 160000);

  it("should not remove any txs if there is no reorg", async () => {
    const old = xpubs[0].xpub.storage.removeTxs;
    xpubs[0].xpub.storage.removeTxs = async () => {
      throw new Error("Should not be called");
    };

    try {
      await xpubs[0].xpub.sync();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log("praline explorer setup error", e);
      throw e;
    }

    const balance1 = await xpubs[0].xpub.getXpubBalance();
    expect(balance1.toNumber()).toEqual(700000000);

    xpubs[0].xpub.storage.removeTxs = old;
  }, 60000);
});
