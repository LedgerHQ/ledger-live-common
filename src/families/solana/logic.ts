import { PublicKey } from "@solana/web3.js";
import { checkOnChainAccountExists, getBalance } from "./api";

export const MAX_MEMO_LENGTH = 500;

export const isValidBase58Address = (address: string) => {
  try {
    const _ = new PublicKey(address);
    return true;
  } catch (_) {
    return false;
  }
};

export const isEd25519Address = (address: string) => {
  return PublicKey.isOnCurve(new PublicKey(address).toBytes());
};

export const checkRecipientExist = checkOnChainAccountExists;

export const isAccountNotFunded = async (address: string) =>
  (await getBalance(address)) <= 0;
