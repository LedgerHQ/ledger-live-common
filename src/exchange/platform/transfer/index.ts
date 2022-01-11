import type { ExchangeProviderNameAndSignature } from "../..";
import { getEnv } from "../../../env";
import { ExchangeTypes } from "../../hw-app-exchange/Exchange";
// FIXME: to be move in this file alongide 'fundProviders' once 'src/exchange/sell/' is deprecated
import { sellProviders } from "../../sell";

const testFundProvider = {
  nameAndPubkey: Buffer.from([
    0x9, 0x46, 0x55, 0x4e, 0x44, 0x5f, 0x54, 0x45, 0x53, 0x54, 0x4, 0x0, 0xbe,
    0xef, 0x98, 0xb4, 0xb2, 0x99, 0x4f, 0x68, 0x8f, 0xd9, 0x8b, 0x56, 0x5e,
    0x17, 0x1e, 0xc9, 0x25, 0x9c, 0x89, 0x6, 0x14, 0xd2, 0xdb, 0xa6, 0x10, 0x52,
    0x2, 0x1, 0x8e, 0x3a, 0x76, 0x4a, 0xa6, 0x68, 0x3e, 0xa1, 0x16, 0xc9, 0xe0,
    0xe3, 0xc8, 0x1, 0xca, 0x5a, 0xb9, 0x72, 0xa2, 0xf8, 0xf7, 0x9f, 0x90, 0x6e,
    0x19, 0xf7, 0x3e, 0xdb, 0x91, 0x45, 0x0, 0xea, 0xd0, 0x2d, 0x70,
  ]),
  signature: Buffer.from([
    0x30, 0x44, 0x2, 0x20, 0x3c, 0x1c, 0xe9, 0xea, 0xf2, 0x1a, 0x18, 0x80, 0x3e,
    0xa9, 0x87, 0x6f, 0xab, 0x8f, 0x8a, 0x24, 0xb0, 0xd6, 0xe5, 0xf2, 0x6e,
    0xf7, 0x54, 0xf2, 0xd1, 0xa0, 0xac, 0x34, 0x24, 0xfc, 0xb8, 0xe1, 0x2, 0x20,
    0x4f, 0x6c, 0x92, 0xcf, 0xec, 0x8f, 0x23, 0x2c, 0x1b, 0x14, 0x89, 0x88,
    0x2f, 0x98, 0x7, 0xf, 0xe3, 0xe2, 0x0, 0x84, 0xd0, 0x23, 0xd6, 0x53, 0xe3,
    0xee, 0xf6, 0x96, 0xbc, 0xa0, 0x27, 0x78,
  ]),
  curve: "secpk256k1",
};

const fundProviders: Record<
  string,
  {
    nameAndPubkey: Buffer;
    signature: Buffer;
    curve: string;
  }
> = {
  // FIXME: no prod provider for now
};

const getProvider = (
  exchangeType: ExchangeTypes,
  providerName: string
): ExchangeProviderNameAndSignature => {
  if (getEnv("MOCK_EXCHANGE_TEST_CONFIG")) {
    return testFundProvider;
  }

  const res = (() => {
    switch (exchangeType) {
      case ExchangeTypes.FUND:
        return fundProviders[providerName.toLowerCase()];

      case ExchangeTypes.SELL:
        return sellProviders[providerName.toLowerCase()];

      default:
        return null;
    }
  })();

  if (!res) {
    throw new Error(`Unknown partner ${providerName}`);
  }

  return res;
};

export { getProvider };
