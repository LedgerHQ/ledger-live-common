import { findTokenById } from "@ledgerhq/cryptoassets";
import { PublicKey } from "@solana/web3.js";
import { TokenAccount } from "../../types/account";
import { Config, getBalance } from "./api";

export type Awaited<T> = T extends PromiseLike<infer U> ? U : T;

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

export const isAccountFunded = async (address: string, config: Config) =>
  (await getBalance(address, config)) > 0;

export function encodeAccountIdWithTokenAccountAddress(
  accountId: string,
  address: string
) {
  return `${accountId}+${address}`;
}

// TODO: rename to assoc token account addr..
export function decodeAccountIdWithTokenAccountAddress(
  accountIdWithTokenAccountAddress: string
) {
  const lastColonIndex = accountIdWithTokenAccountAddress.lastIndexOf("+");
  return {
    accountId: accountIdWithTokenAccountAddress.slice(0, lastColonIndex),
    address: accountIdWithTokenAccountAddress.slice(lastColonIndex + 1),
  };
}

export function toTokenId(mint: string) {
  return `solana/spl/${mint}`;
}

export function toTokenMint(tokenId: string) {
  return tokenId.split("/")[2];
}

export function toSubAccMint(subAcc: TokenAccount) {
  return toTokenMint(subAcc.token.id);
}

export function tokenIsListedOnLedger(mint: string) {
  return findTokenById(toTokenId(mint))?.type === "TokenCurrency";
}
