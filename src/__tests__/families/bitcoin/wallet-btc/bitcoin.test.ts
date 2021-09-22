import { Currency } from "../../../../families/bitcoin/wallet-btc/crypto/types";
import cryptoFactory from "../../../../families/bitcoin/wallet-btc/crypto/factory";

describe("Unit tests for various bitcoin functions", () => {
  function testAddresses(addresses: string[][], currency: Currency) {
    const bitcoin = cryptoFactory(currency);
    addresses.forEach((pair: string[]) => {
      const result = bitcoin.toOutputScript(pair[0]);
      const actual = result.toString("hex");
      expect(actual).toEqual(pair[1]);
    });
  }

  it("Test toOutputScript", () => {
    // Test vectors from BIP350
    const mainnetAddrs = [
      [
        "BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4",
        "0014751e76e8199196d454941c45d1b3a323f1433bd6",
      ],
      [
        "bc1pw508d6qejxtdg4y5r3zarvary0c5xw7kw508d6qejxtdg4y5r3zarvary0c5xw7kt5nd6y",
        "5128751e76e8199196d454941c45d1b3a323f1433bd6751e76e8199196d454941c45d1b3a323f1433bd6",
      ],
      ["BC1SW50QGDZ25J", "6002751e"],
      [
        "bc1zw508d6qejxtdg4y5r3zarvaryvaxxpcs",
        "5210751e76e8199196d454941c45d1b3a323",
      ],
      [
        "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0",
        "512079be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
      ],
    ];
    testAddresses(mainnetAddrs, "bitcoin");
    const testnetAddrs = [
      [
        "tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7",
        "00201863143c14c5166804bd19203356da136c985678cd4d27a1b8c6329604903262",
      ],
      [
        "tb1qqqqqp399et2xygdj5xreqhjjvcmzhxw4aywxecjdzew6hylgvsesrxh6hy",
        "0020000000c4a5cad46221b2a187905e5266362b99d5e91c6ce24d165dab93e86433",
      ],
      [
        "tb1pqqqqp399et2xygdj5xreqhjjvcmzhxw4aywxecjdzew6hylgvsesf3hn0c",
        "5120000000c4a5cad46221b2a187905e5266362b99d5e91c6ce24d165dab93e86433",
      ],
    ];
    testAddresses(testnetAddrs, "bitcoin_testnet");
  });

  it("toOutputScript p2sh and p2pkh work as expected", () => {
    const p2pkh = [
      [
        "13wuYubzsKiGHm6su5BJQ1PdWUitkJV3kE",
        "76a91420529483bd2a346c0e09b032b7a31a574f2a0d5688ac",
      ],
    ];
    testAddresses(p2pkh, "bitcoin");
    const p2sh = [
      [
        "3P2B3M3R33mAYX3o2ic7PdT4MM6McL2anh",
        "a914e9fa27cc45abc468e59bb54c66143099dbe4d3cf87",
      ],
    ];
    testAddresses(p2sh, "bitcoin");
    const p2pkhTestnet = [
      [
        "mxVFsFW5N4mu1HPkxPttorvocvzeZ7KZyk",
        "76a914ba27f99e007c7f605a8305e318c1abde3cd220ac88ac",
      ],
    ];
    testAddresses(p2pkhTestnet, "bitcoin_testnet");
    const p2shTestnet = [
      [
        "2Mwp1inKcSNWSmai2giKV4YBvYiA3253cky",
        "a9143213fd5b1fa0d58e0a9be31fd5095a749c186aa787",
      ],
    ];
    testAddresses(p2shTestnet, "bitcoin_testnet");
  });
});
