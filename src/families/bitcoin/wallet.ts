import { WalletLedger } from "wallet-btc";
import type { Account } from "./../../types";
let wallet: WalletLedger | null = null;
export const getWalletAccount = async (account: Account) => {
  const walletData = account.bitcoinResources?.serializedData;
  if (!walletData) {
    throw new Error("bitcoin wallet account expected");
  }
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
