import { Currency } from "./crypto/types";
import WalletLedger from "./wallet";
import {
  DerivationModes,
  InputInfo,
  OutputInfo,
  TransactionInfo,
} from "./types";
import { Account, SerializedAccount } from "./account";
import { TX, Input, Output } from "./storage/types";
import { CoinSelect } from "./pickingstrategies/CoinSelect";
import { DeepFirst } from "./pickingstrategies/DeepFirst";
import { Merge } from "./pickingstrategies/Merge";
import { isValidAddress } from "./utils";

import type { Account as LiveAccount } from "./../../../types";

export {
  WalletLedger,
  Account,
  SerializedAccount,
  DerivationModes,
  Input,
  Output,
  InputInfo,
  OutputInfo,
  TransactionInfo,
  TX,
  CoinSelect,
  DeepFirst,
  Merge,
  isValidAddress,
  Currency,
};

let wallet: WalletLedger | null = null;
export const getWalletAccount = async (account: LiveAccount) => {
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
