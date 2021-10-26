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

export const isAccountNotFunded = async (address: string) =>
  (await getBalance(address)) <= 0;
