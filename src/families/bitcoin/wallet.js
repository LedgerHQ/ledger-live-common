// @flow
import WalletLedger from "wallet-btc";

let wallet = null;

const getWallet = () => {
  if (!wallet) {
    wallet = new WalletLedger();
  }
  return wallet;
};

export default getWallet();
