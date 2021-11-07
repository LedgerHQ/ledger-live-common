import { PublicKey } from "@solana/web3.js";
import { getBalance } from "./api";

export const MAX_MEMO_LENGTH = 500;

export const isValidBase58Address = (address: string) => {
  try {
    return Boolean(new PublicKey(address));
  } catch (_) {
    return false;
  }
};

export const isEd25519Address = (address: string) => {
  return PublicKey.isOnCurve(new PublicKey(address).toBytes());
};

export const isAccountFunded = async (address: string) =>
  (await getBalance(address)) > 0;

export function encodeAccountIdWithTokenAccountAddress(
  accountId: string,
  address: string
) {
  return `${accountId}+${address}`;
}

export function decodeAccountIdWithTokenAccountAddress(
  accountIdWithTokenAccountAddress: string
) {
  const lastColonIndex = accountIdWithTokenAccountAddress.lastIndexOf("+");
  return {
    accountId: accountIdWithTokenAccountAddress.slice(0, lastColonIndex),
    address: accountIdWithTokenAccountAddress.slice(lastColonIndex + 1),
  };
}
