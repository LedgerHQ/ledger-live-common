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

  const xpubs = [1, 2, 3].map((i) => {
    const storage = new Storage();
    const seed = bip39.mnemonicToSeedSync(`test${i} test${i} test${i}`);
    const node = bip32.fromSeed(seed, network);
    const signer = (account, index) =>
      bitcoin.ECPair.fromWIF(
        node.derive(account).derive(index).toWIF(),
        network
      );
    const xpub = new Xpub({
      storage: storage,
      explorer,
      crypto,
      xpub: node.neutered().toBase58(),
      derivationMode: "Legacy",
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
    const address = await xpubs[0].xpub.getNewAddress(0, 0);

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
      await xpubs[0].xpub.sync();
    } catch (e) {
      console.log("praline explorer setup error", e);
    }
  }, 30000);

  it("should be setup correctly", async () => {
    const balance1 = await xpubs[0].xpub.getXpubBalance();

    expect(balance1).toEqual(5700000000);
  });

  it("should send a 1 btc tx to xpubs[1].xpub", async () => {
    const address = await xpubs[1].xpub.getNewAddress(0, 0);

    const psbt = await xpubs[0].xpub.buildTx(
      {
        account: 1,
        gap: 1,
      },
      address,
      100000000,
      500
    );

    // this part is the signature to tx hex part that is supposedly handled by the device
    psbt.psbt.txInputs.forEach((input, i) => {
      psbt.psbt.signInput(
        i,
        xpubs[0].signer(
          psbt.inputsAddresses[i].account,
          psbt.inputsAddresses[i].index
        )
      );
      psbt.psbt.validateSignaturesOfInput(i);
    });
    psbt.psbt.finalizeAllInputs();
    const rawTxHex = psbt.psbt.extractTransaction().toHex();
    //

    try {
      await xpubs[0].xpub.broadcastTx(rawTxHex);
    } catch (e) {
      console.log("broadcast error", e);
    }

    try {
      const mineAddress = await xpubs[2].xpub.getNewAddress(0, 0);
      await axios.post(`http://localhost:28443/chain/mine/${mineAddress}/1`);
    } catch (e) {
      console.log("praline error");
    }

    // time for explorer to sync
    await sleep(20000);

    await xpubs[0].xpub.sync();
    await xpubs[1].xpub.sync();

    expect(await xpubs[0].xpub.getXpubBalance()).toEqual(
      5700000000 - 100000000 - 500
    );
    expect(await xpubs[1].xpub.getXpubBalance()).toEqual(100000000);
  }, 30000);
});
