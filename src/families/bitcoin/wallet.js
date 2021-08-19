// @flow
import invariant from "invariant";
import WalletLedger from "wallet-btc";
import type { Account } from "./../../types";

let wallet = null;

export const getWalletAccount = async (account: Account) => {
  const walletData = account.bitcoinResources?.serializedData;
  invariant(walletData, "bitcoin wallet account expected");
  const walletInstance = getWallet();
  return await walletInstance.importFromSerializedAccount(walletData);
};

const getWallet = () => {
  if (!wallet) {
    wallet = new WalletLedger();
  }
  return wallet;
};

export default getWallet();
