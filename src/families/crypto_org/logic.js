import { CroNetwork, utils } from "@crypto-com/chain-jslib";
import { getEnv } from "../../env";

const CRYPTO_ORG_USE_TESTNET = getEnv("CRYPTO_ORG_USE_TESTNET");

export const FIXED_GAS_PRICE = 0.025;
export const FIXED_DEFAULT_GAS_LIMIT = 200000;

/**
 * Returns true if address is a valid md5
 *
 * @param {string} address
 */
export const isValidAddress = (address: string): boolean => {
  if (!address) return false;

  const network = CRYPTO_ORG_USE_TESTNET
    ? CroNetwork.Testnet
    : CroNetwork.Mainnet;

  const addressProps = {
    address: address,
    network: network,
    type: utils.AddressType.USER,
  };

  const addressValidator = new utils.AddressValidator(addressProps);
  return addressValidator.isValid();
};