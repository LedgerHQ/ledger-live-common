import { PublicKey } from "@solana/web3.js";
import { checkOnChainAccountExists } from "./api/web3";

export const isAddressValid = (address: string) => {
  try {
    const _ = new PublicKey(address);
    return true;
  } catch (_) {
    return false;
  }
};

export const checkRecipientExist = checkOnChainAccountExists;
