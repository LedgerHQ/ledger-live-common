import { CroNetwork, utils } from "@crypto-com/chain-jslib";

export const FIXED_GAS_PRICE = 0.025;
export const FIXED_DEFAULT_GAS_LIMIT = 200000;

/**
 * Returns true if address is a valid md5
 *
 * @param {string} address
 */
export const isValidAddress = (address: string): boolean => {
  if (!address) return false;

  const addressProps = {
    address: address,
    network: CroNetwork.Mainnet,
    type: utils.AddressType.USER,
  };

  const addressValidator = new utils.AddressValidator(addressProps);
  return addressValidator.isValid();
};