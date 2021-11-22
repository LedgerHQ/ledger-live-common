import BigNumber from "bignumber.js";
import BIP32Factory from "bip32";
import * as bip39 from "bip39";
import coininfo from "coininfo";
import { ECPair } from "ecpair";
import * as ecc from "tiny-secp256k1";
import Crypto from "../../../../families/bitcoin/wallet-btc/crypto/bitcoin";
import BitcoinLikeExplorer from "../../../../families/bitcoin/wallet-btc/explorer";
import { CoinSelect } from "../../../../families/bitcoin/wallet-btc/pickingstrategies/CoinSelect";
import { DeepFirst } from "../../../../families/bitcoin/wallet-btc/pickingstrategies/DeepFirst";
import { Merge } from "../../../../families/bitcoin/wallet-btc/pickingstrategies/Merge";
import BitcoinLikeStorage from "../../../../families/bitcoin/wallet-btc/storage";
import { DerivationModes } from "../../../../families/bitcoin/wallet-btc/types";
import Xpub from "../../../../families/bitcoin/wallet-btc/xpub";

const bip32 = BIP32Factory(ecc);

describe("testing xpub legacy transactions", () => {
  const network = coininfo.bitcoin.test.toBitcoinJS();

  const crypto = new Crypto({
    network,
  });

  const storage = new BitcoinLikeStorage();
  const seed = bip39.mnemonicToSeedSync("test1 test1 test1");
  const node = bip32.fromSeed(seed, network);
  const signer = (account: number, index: number) =>
    ECPair.fromPrivateKey(node.derive(account).derive(index).privateKey!);
  const xpub = new Xpub({
    storage,
    explorer: new BitcoinLikeExplorer({
      explorerURI: "https://explorers.api.live.ledger.com/blockchain/v3/btc",
      explorerVersion: "v3",
    }),
    crypto,
    xpub: node.neutered().toBase58(),
    derivationMode: DerivationModes.LEGACY,
  });
  const dataset = {
    storage,
    seed,
    node,
    signer,
    xpub,
  };

  it("merge output strategy should be correct", async () => {
    // Initialize the xpub with 2 txs. So that it has 2 utxo
    dataset.xpub.storage.appendTxs([
      {
        hash: "9e1b337875c21f751e70ee2c2c6ee93d8a6733d0f3ba6d139ae6a0479ebcefb0",
        inputs: [],
        outputs: [
          {
            output_index: 0,
            value: "5000000000",
            address: "mwXTtHo8Yy3aNKUUZLkBDrTcKT9qG9TqLb",
            script_hex: "76a914af9ab6987aa41b37c8bcb7c61154165d23f09e3488ac",
            output_hash:
              "9e1b337875c21f751e70ee2c2c6ee93d8a6733d0f3ba6d139ae6a0479ebcefb0",
            block_height: 1,
            rbf: false,
          },
          {
            output_index: 1,
            value: "0",
            address: "<unknown>",
            script_hex:
              "6a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf9",
            output_hash:
              "9e1b337875c21f751e70ee2c2c6ee93d8a6733d0f3ba6d139ae6a0479ebcefb0",
            block_height: 1,
            rbf: false,
          },
        ],
        block: {
          hash: "73c565a6f226978df23480e440b27eb02f307855f50aa3bc72ebb586938f23e0",
          height: 1,
          time: "2021-07-28T13:34:17Z",
        },
        account: 0,
        index: 0,
        address: "mwXTtHo8Yy3aNKUUZLkBDrTcKT9qG9TqLb",
        received_at: "2021-07-28T13:34:17Z",
      },
      {
        hash: "0b9f98d07eb418fa20573112d3cba6b871d429a06c724a7888ff0886be5213d1",
        inputs: [
          {
            output_hash:
              "2772f3963856f3eb38cb706ec8c2b62fcdeb2ce10f32cf7160afb3873be6f60d",
            output_index: 0,
            value: "5000000000",
            address: "2NCDBM9DAuMrD1T8XDHMxvbTmLutP7at4AB",
            sequence: 4294967294,
          },
        ],
        outputs: [
          {
            output_index: 0,
            value: "300000000",
            address: "mwXTtHo8Yy3aNKUUZLkBDrTcKT9qG9TqLb",
            script_hex: "76a914af9ab6987aa41b37c8bcb7c61154165d23f09e3488ac",
            output_hash:
              "0b9f98d07eb418fa20573112d3cba6b871d429a06c724a7888ff0886be5213d1",
            block_height: 120,
            rbf: false,
          },
          {
            output_index: 1,
            value: "4699983200",
            address: "2MynSTpze5SDcuLr1DekSV7RVrFpQCo3LeP",
            script_hex: "a91447b810238a31777fc4e4de474419464c46aadf8187",
            output_hash:
              "0b9f98d07eb418fa20573112d3cba6b871d429a06c724a7888ff0886be5213d1",
            block_height: 120,
            rbf: false,
          },
        ],
        block: {
          hash: "305d4b8d4a6d6ecca0a3dd0216f8ecd090978ed346d1845883c8aa4529d72fc8",
          height: 120,
          time: "2021-07-28T13:34:38Z",
        },
        account: 0,
        index: 0,
        address: "mwXTtHo8Yy3aNKUUZLkBDrTcKT9qG9TqLb",
        received_at: "2021-07-28T13:34:38Z",
      },
    ]);
    // this account has one utxo 500000000 and one utxo 300000000
    const utxoPickingStrategy = new Merge(
      dataset.xpub.crypto,
      dataset.xpub.derivationMode,
      []
    );
    let res = await utxoPickingStrategy.selectUnspentUtxosToUse(
      dataset.xpub,
      new BigNumber(10000),
      0,
      1
    );
    expect(res.unspentUtxos.length).toEqual(1); // only 1 utxo is enough
    expect(Number(res.unspentUtxos[0].value)).toEqual(300000000); // use cheaper utxo first
    res = await utxoPickingStrategy.selectUnspentUtxosToUse(
      dataset.xpub,
      new BigNumber(500000000),
      0,
      1
    );
    expect(res.unspentUtxos.length).toEqual(2); // need 2 utxo
    expect(
      Number(res.unspentUtxos[0].value) + Number(res.unspentUtxos[1].value)
    ).toEqual(300000000 + 5000000000);
  }, 100000);

  it("deep first output strategy should be correct", async () => {
    // this account has one utxo 500000000 and one utxo 300000000
    const utxoPickingStrategy = new DeepFirst(
      dataset.xpub.crypto,
      dataset.xpub.derivationMode,
      []
    );
    let res = await utxoPickingStrategy.selectUnspentUtxosToUse(
      dataset.xpub,
      new BigNumber(10000),
      0,
      1
    );
    expect(res.unspentUtxos.length).toEqual(1); // only 1 utxo is enough
    expect(Number(res.unspentUtxos[0].value)).toEqual(5000000000); // use old utxo first
    res = await utxoPickingStrategy.selectUnspentUtxosToUse(
      dataset.xpub,
      new BigNumber(5200000000),
      0,
      1
    );
    expect(res.unspentUtxos.length).toEqual(2); // need 2 utxo
    expect(
      Number(res.unspentUtxos[0].value) + Number(res.unspentUtxos[1].value)
    ).toEqual(300000000 + 5000000000);
  }, 100000);

  it("coin select strategy should be correct", async () => {
    // Add 3 txs for the xpub. So that it has 5 utxo
    dataset.xpub.storage.appendTxs([
      {
        hash: "8f30fe84da5a5846d668b4bad260730f2b0125fa66fb2633fa1cee23c6b11053",
        inputs: [
          {
            output_hash:
              "06dedd72cd68c036070fbd2453dfc1c6c1dd48ac899b175680db8f1417952ffd",
            output_index: 1,
            value: "4699983200",
            address: "2MuiiwsWDJZETrMWR43VhM2FDvTsvHNn8oZ",
            sequence: 4294967294,
          },
        ],
        outputs: [
          {
            output_index: 0,
            value: "4599966400",
            address: "2NCSYYp4bWdHDYf9nYP1NDKb1GMBqa8e57H",
            script_hex: "a914d28e7592fc2657433296eafc89e4a8d29289ebf087",
            output_hash:
              "8f30fe84da5a5846d668b4bad260730f2b0125fa66fb2633fa1cee23c6b11053",
            block_height: 122,
            rbf: false,
          },
          {
            output_index: 1,
            value: "100000000",
            address: "mwXTtHo8Yy3aNKUUZLkBDrTcKT9qG9TqLb",
            script_hex: "76a914af9ab6987aa41b37c8bcb7c61154165d23f09e3488ac",
            output_hash:
              "8f30fe84da5a5846d668b4bad260730f2b0125fa66fb2633fa1cee23c6b11053",
            block_height: 122,
            rbf: false,
          },
        ],
        block: {
          hash: "07b88745bbec95383dd8588501bf21a72c3f48537860ca0c1e2ac646e124885c",
          height: 122,
          time: "2021-07-28T14:46:51Z",
        },
        account: 0,
        index: 0,
        address: "mwXTtHo8Yy3aNKUUZLkBDrTcKT9qG9TqLb",
        received_at: "2021-07-28T14:46:51Z",
      },
      {
        hash: "2f90f3312ffd4dce490cb2f7429c586a43ef68c99fc2f8e549127b72af7b4209",
        inputs: [
          {
            output_hash:
              "8f30fe84da5a5846d668b4bad260730f2b0125fa66fb2633fa1cee23c6b11053",
            output_index: 0,
            value: "4599966400",
            address: "2NCSYYp4bWdHDYf9nYP1NDKb1GMBqa8e57H",
            sequence: 4294967294,
          },
        ],
        outputs: [
          {
            output_index: 0,
            value: "4399949600",
            address: "2NFToPiLBtuKiqzZj43nPXknN8d4xNySe3o",
            script_hex: "a914f3b3a49bd90e6e9ae30882a2b7e9b7edfe579a8c87",
            output_hash:
              "2f90f3312ffd4dce490cb2f7429c586a43ef68c99fc2f8e549127b72af7b4209",
            block_height: 123,
            rbf: false,
          },
          {
            output_index: 1,
            value: "200000000",
            address: "mwXTtHo8Yy3aNKUUZLkBDrTcKT9qG9TqLb",
            script_hex: "76a914af9ab6987aa41b37c8bcb7c61154165d23f09e3488ac",
            output_hash:
              "2f90f3312ffd4dce490cb2f7429c586a43ef68c99fc2f8e549127b72af7b4209",
            block_height: 123,
            rbf: false,
          },
        ],
        block: {
          hash: "0060d6a1632cf380b9262790e4646e5a48e7f9e099a089640837ec1ef3614159",
          height: 123,
          time: "2021-07-28T14:46:51Z",
        },
        account: 0,
        index: 0,
        address: "mwXTtHo8Yy3aNKUUZLkBDrTcKT9qG9TqLb",
        received_at: "2021-07-28T14:46:51Z",
      },
      {
        hash: "2fee0c4b55e08583aa5bc565d7e428f7cdcbd2b73262f62208a6a72a74e2c945",
        inputs: [
          {
            output_hash:
              "2f90f3312ffd4dce490cb2f7429c586a43ef68c99fc2f8e549127b72af7b4209",
            output_index: 0,
            value: "4399949600",
            address: "2NFToPiLBtuKiqzZj43nPXknN8d4xNySe3o",
            sequence: 4294967294,
          },
        ],
        outputs: [
          {
            output_index: 0,
            value: "600000000",
            address: "mwXTtHo8Yy3aNKUUZLkBDrTcKT9qG9TqLb",
            script_hex: "76a914af9ab6987aa41b37c8bcb7c61154165d23f09e3488ac",
            output_hash:
              "2fee0c4b55e08583aa5bc565d7e428f7cdcbd2b73262f62208a6a72a74e2c945",
            block_height: 124,
            rbf: false,
          },
          {
            output_index: 1,
            value: "3799932800",
            address: "2N53XuFRxqbShpK4XKwC1VXT4zu1wCzbAMU",
            script_hex: "a914816b7896ce2c4f21c39c865030fe07e7a042a9c687",
            output_hash:
              "2fee0c4b55e08583aa5bc565d7e428f7cdcbd2b73262f62208a6a72a74e2c945",
            block_height: 124,
            rbf: false,
          },
        ],
        block: {
          hash: "0ba663caf7775546cec9dfbdfd7e7d43d7ed576bb87c619271cccbcb572b328e",
          height: 124,
          time: "2021-07-28T14:46:51Z",
        },
        account: 0,
        index: 0,
        address: "mwXTtHo8Yy3aNKUUZLkBDrTcKT9qG9TqLb",
        received_at: "2021-07-28T14:46:51Z",
      },
    ]);
    // we have 5 utxo now. 100000000, 200000000, 300000000, 600000000 and 5000000000
    const utxoPickingStrategy = new CoinSelect(
      dataset.xpub.crypto,
      dataset.xpub.derivationMode,
      []
    );
    let res = await utxoPickingStrategy.selectUnspentUtxosToUse(
      dataset.xpub,
      new BigNumber(10000),
      10,
      1
    );
    expect(res.unspentUtxos.length).toEqual(1);
    expect(Number(res.unspentUtxos[0].value)).toEqual(100000000);

    res = await utxoPickingStrategy.selectUnspentUtxosToUse(
      dataset.xpub,
      new BigNumber(290000000),
      10,
      1
    );
    expect(res.unspentUtxos.length).toEqual(1);
    expect(Number(res.unspentUtxos[0].value)).toEqual(300000000);

    res = await utxoPickingStrategy.selectUnspentUtxosToUse(
      dataset.xpub,
      new BigNumber(500000000),
      10,
      1
    );
    expect(res.unspentUtxos.length).toEqual(1);
    expect(Number(res.unspentUtxos[0].value)).toEqual(600000000);

    res = await utxoPickingStrategy.selectUnspentUtxosToUse(
      dataset.xpub,
      new BigNumber(800000000),
      10,
      1
    );
    expect(res.unspentUtxos.length).toEqual(1);
    expect(Number(res.unspentUtxos[0].value)).toEqual(5000000000);

    res = await utxoPickingStrategy.selectUnspentUtxosToUse(
      dataset.xpub,
      new BigNumber(5000000000),
      10,
      1
    );
    expect(res.unspentUtxos.length).toEqual(2);
    expect(
      Number(res.unspentUtxos[0].value) + Number(res.unspentUtxos[1].value)
    ).toEqual(5100000000);

    res = await utxoPickingStrategy.selectUnspentUtxosToUse(
      dataset.xpub,
      new BigNumber(5600000000),
      10,
      1
    );
    expect(res.unspentUtxos.length).toEqual(3);
    expect(
      Number(res.unspentUtxos[0].value) +
        Number(res.unspentUtxos[1].value) +
        Number(res.unspentUtxos[2].value)
    ).toEqual(5000000000 + 600000000 + 100000000);
  }, 180000);
});
