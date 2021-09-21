import { bech32m, bech32, BechLib } from "bech32";
import * as utils from "../utils";
import { Currency } from "../crypto/types";

function validateAddrs(
  addresses: string[],
  currency: Currency,
  expectedValid: boolean
) {
  addresses.forEach((address: string) => {
    expect(utils.isValidAddress(address, currency)).toEqual(expectedValid);
  });
}

function toBech32(
  data: Buffer,
  version: number,
  prefix: string,
  bech32variant: BechLib
): string {
  const words = bech32.toWords(data);
  words.unshift(version);

  return bech32variant.encode(prefix, words);
}

const v0addrEncodedWithBase32 = toBech32(
  Buffer.from(
    "7777777777777777777777777777777777777777777777777777777777777777",
    "hex"
  ),
  0,
  "bc",
  bech32
);
const v1addrEncodedWithBase32m = toBech32(
  Buffer.from(
    "7777777777777777777777777777777777777777777777777777777777777777",
    "hex"
  ),
  1,
  "bc",
  bech32m
);
const v0addrEncodedWithBase32m = toBech32(
  Buffer.from(
    "7777777777777777777777777777777777777777777777777777777777777777",
    "hex"
  ),
  0,
  "bc",
  bech32m
);
const v1addrEncodedWithBase32 = toBech32(
  Buffer.from(
    "7777777777777777777777777777777777777777777777777777777777777777",
    "hex"
  ),
  1,
  "bc",
  bech32
);

describe("Unit tests for various utils functions", () => {
  it("Test isValidAddress accepts valid bech32 address", () => {
    const validMainnetAddresses = [
      // bech32
      "BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4",
      v0addrEncodedWithBase32,
      // bech32m
      "bc1pw508d6qejxtdg4y5r3zarvary0c5xw7kw508d6qejxtdg4y5r3zarvary0c5xw7kt5nd6y",
      "BC1SW50QGDZ25J",
      "bc1zw508d6qejxtdg4y5r3zarvaryvaxxpcs",
      "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0",
      v1addrEncodedWithBase32m,
    ];
    validateAddrs(validMainnetAddresses, "bitcoin", true);

    const validTestnetAddresses = [
      // bech32
      "tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7",
      // bech32m
      "tb1qqqqqp399et2xygdj5xreqhjjvcmzhxw4aywxecjdzew6hylgvsesrxh6hy",
      "tb1pqqqqp399et2xygdj5xreqhjjvcmzhxw4aywxecjdzew6hylgvsesf3hn0c",
    ];
    validateAddrs(validTestnetAddresses, "bitcoin_testnet", true);

    const invalidMainnetAddresses = [
      "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqh2y7hd", // Invalid checksum (Bech32 instead of Bech32m)
      "BC1S0XLXVLHEMJA6C4DQV22UAPCTQUPFHLXM9H8Z3K2E72Q4K9HCZ7VQ54WELL", // Invalid checksum (Bech32 instead of Bech32m)
      "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kemeawh", // Invalid checksum (Bech32m instead of Bech32)
      "bc1p38j9r5y49hruaue7wxjce0updqjuyyx0kh56v8s25huc6995vvpql3jow4", // Invalid character in checksum
      "BC130XLXVLHEMJA6C4DQV22UAPCTQUPFHLXM9H8Z3K2E72Q4K9HCZ7VQ7ZWS8R", // Invalid witness version
      "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7v07qwwzcrf", // zero padding of more than 4 bits
      "bc1pw5dgrnzv", // Invalid program length (1 byte)
      "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7v8n0nx0muaewav253zgeav", // Invalid program length (41 bytes)
      "BC1QR508D6QEJXTDG4Y5R3ZARVARYV98GJ9P", // Invalid program length for witness version 0 (per BIP141)
      "tb1qqqqqp399et2xygdj5xreqhjjvcmzhxw4aywxecjdzew6hylgvsesrxh6hy", // Testnet addr used on mainnet
      "bc1gmk9yu", // Empty data section
      v0addrEncodedWithBase32m, // Version 0 address must be encoded with bech32
      v1addrEncodedWithBase32, // Version 1 address must be encoded with bech32m
    ];
    validateAddrs(invalidMainnetAddresses, "bitcoin", false);

    const invalidTestnetAddresses = [
      "tc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vq5zuyut", // Invalid human-readable part
      "tb1z0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqglt7rf", // Invalid checksum (Bech32 instead of Bech32m)
      "tb1q0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vq24jc47", // Invalid checksum (Bech32m instead of Bech32)
      "tb1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vq47Zagq", // Mixed case
      "tb1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vpggkg4j", // Non-zero padding in 8-to-5 conversion
      "bc1pw508d6qejxtdg4y5r3zarvary0c5xw7kw508d6qejxtdg4y5r3zarvary0c5xw7kt5nd6y", // Mainnet addr used on testnet
    ];
    validateAddrs(invalidTestnetAddresses, "bitcoin_testnet", false);
  });

  it("isValidAddress should default old validation if currency not provided", () => {
    expect(
      utils.isValidAddress(
        "tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7"
      )
    ).toBeTruthy();
    expect(
      utils.isValidAddress(
        "tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k8"
      )
    ).toBeFalsy();
  });

  it("Test altcoins", () => {
    validateAddrs(
      [
        "1BpEi6DfDAUFd7GtittLSdBeYJvcoaVggu",
        "bitcoincash:qqmyc72pkyx8c0ppgeuummq6clzverhxnsk3qh6jcf",
      ],
      "bitcoin_cash",
      true
    );
    validateAddrs(
      ["bitcoincash:qqmyc72pkyx8c0ppgeuummq6clzverhxnsk3qh6jc1"],
      "bitcoin_cash",
      false
    );

    validateAddrs(
      ["bitcoincash:qzl0x0982hy9xrh99wdnejx4eecdn02jv58as5p595"],
      "bitcoin_cash",
      true
    );
    validateAddrs(
      ["ltc1q3e4eh3lldvx97zg6d74x4ns6v5a4j4hwwqycwv"],
      "litecoin",
      true
    );
    validateAddrs(["Xh13o3cWixDBYJMGuJmFX17TZb9guXcBik"], "dash", true);
    validateAddrs(["MFYvHZcZ35typC4k2XyvRVooCDZxnoDS4B"], "qtum", true);
    validateAddrs(["t1b1Rbw2shhJkP6MCnCyxCPuyFedHrwKty8"], "zcash", true);
    validateAddrs(["AYRf8r4SJhmfaEwmWvY8ujmrepbrWyenFr"], "bitcoin_gold", true);
    validateAddrs(["D8cMCRimfjwQ9E8jJvgUswt18WnZbCUAaW"], "dogecoin", true);
    validateAddrs(
      ["dgb1q7zjgqa23xzf602ljfrc94248a9u27xml08nhct"],
      "digibyte",
      true
    );
    validateAddrs(["REnTkuvjsmfshAZ3vukYfuS3ZGvfUatqFc"], "komodo", true);
    validateAddrs(["DQ7F2iTQn6kUpyvietinaC3Cxje2m1ULjS"], "pivx", true);
    validateAddrs(["zndVnjbrzRxvhPGRea4jgsfSWE1hXFja1dc"], "zencash", true);
    validateAddrs(["3LQWwDEpgjjQokDusDXtoF9c8on8zr54fT"], "vertcoin", true);
    validateAddrs(["PCYt39DMYuFqUYkP8w6ubZXJbTTL4c9KAV"], "peercoin", true);
    validateAddrs(["ETx91CT52eBFYWbe4Yht5BpZNigWg2EkqJ"], "viacoin", true);
    validateAddrs(["7i1KkJHUjfw2MrbtXK5DQkhz7zd36st9GR"], "stakenet", true);
    validateAddrs(["S6NMcEfYbavHrP3Uo1wbEUvKhAbKeMuga8"], "stealthcoin", true);

    validateAddrs(
      ["bitcoincash:qzl0x0982hy9xrh99wdnejx4eecdn02jv58as5p599"],
      "bitcoin_cash",
      false
    );
    validateAddrs(
      ["ltc1q3e4eh3lldvx97zg6d74x4ns6v5a4j4hwwqycww"],
      "litecoin",
      false
    );
    validateAddrs(["Xh13o3cWixDBYJMGuJmFX17TZb9guXcBii"], "dash", false);
    validateAddrs(["MFYvHZcZ35typC4k2XyvRVooCDZxnoDS44"], "qtum", false);
    validateAddrs(["t1b1Rbw2shhJkP6MCnCyxCPuyFedHrwKtyy"], "zcash", false);
    validateAddrs(
      ["AYRf8r4SJhmfaEwmWvY8ujmrepbrWyenFF"],
      "bitcoin_gold",
      false
    );
    validateAddrs(["D8cMCRimfjwQ9E8jJvgUswt18WnZbCUAaa"], "dogecoin", false);
    validateAddrs(
      ["dgb1q7zjgqa23xzf602ljfrc94248a9u27xml08nhcc"],
      "digibyte",
      false
    );
    validateAddrs(["REnTkuvjsmfshAZ3vukYfuS3ZGvfUatqFF"], "komodo", false);
    validateAddrs(["DQ7F2iTQn6kUpyvietinaC3Cxje2m1ULjj"], "pivx", false);
    validateAddrs(["zndVnjbrzRxvhPGRea4jgsfSWE1hXFja1dd"], "zencash", false);
    validateAddrs(["3LQWwDEpgjjQokDusDXtoF9c8on8zr54ff"], "vertcoin", false);
    validateAddrs(["PCYt39DMYuFqUYkP8w6ubZXJbTTL4c9KAA"], "peercoin", false);
    validateAddrs(["ETx91CT52eBFYWbe4Yht5BpZNigWg2Ekqq"], "viacoin", false);
    validateAddrs(["7i1KkJHUjfw2MrbtXK5DQkhz7zd36st9GG"], "stakenet", false);
    validateAddrs(["S6NMcEfYbavHrP3Uo1wbEUvKhAbKeMugaa"], "stealthcoin", false);
  });
});
