import { CroNetwork, CroSDK, utils } from "@crypto-com/chain-jslib";
import { getEnv } from "../../env";

const CRYPTO_ORG_USE_TESTNET = getEnv("CRYPTO_ORG_USE_TESTNET");

export const FIXED_GAS_PRICE = 0.025;
export const FIXED_DEFAULT_GAS_LIMIT = 200000;

export const TestnetCroeseid3 = {
  defaultNodeUrl: "https://testnet-croeseid-3.crypto.org",
  chainId: "testnet-croeseid-3",
  addressPrefix: "tcro",
  validatorAddressPrefix: "tcrocncl",
  validatorPubKeyPrefix: "tcrocnclconspub",
  coin: {
    baseDenom: "basetcro",
    croDenom: "tcro",
  },
  bip44Path: {
    coinType: 1,
    account: 0,
  },
  rpcUrl: "https://testnet-croeseid-3.crypto.org:26657",
};

export const CroSdk = getEnv("CRYPTO_ORG_USE_TESTNET")
  ? CroSDK({ network: TestnetCroeseid3 })
  : CroSDK({ network: CroNetwork.Mainnet });

/**
 * Returns true if address is a valid md5
 *
 * @param {string} address
 */
export const isValidAddress = (address: string): boolean => {
  if (!address) return false;

  const network = CRYPTO_ORG_USE_TESTNET
    ? TestnetCroeseid3
    : CroNetwork.Mainnet;

  const addressProps = {
    address: address,
    network: network,
    type: utils.AddressType.USER,
  };

  const addressValidator = new utils.AddressValidator(addressProps);
  return addressValidator.isValid();
};
