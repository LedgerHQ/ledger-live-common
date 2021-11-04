import { Currency } from "./crypto/types";
import BitcoinLikeWallet from "./wallet";
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
import { isValidAddress, isTaprootAddress } from "./utils";

import type { Account as WalletAccount } from "./account";
import type { Account as LiveAccount } from "./../../../types";
import { AccountNeedResync } from "../../../errors";

export {
  BitcoinLikeWallet,
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
  isTaprootAddress,
  Currency,
};

let wallet: BitcoinLikeWallet | null = null;

export const getWalletAccount = (account: LiveAccount): WalletAccount => {
  if (account.id.startsWith("libcore")) throw new AccountNeedResync();
  const walletAccount = account.bitcoinResources?.walletAccount;
  if (!walletAccount) {
    throw new Error("bitcoin wallet account expected");
  }
  return walletAccount;
};

const getWallet = () => {
  if (!wallet) {
    wallet = new BitcoinLikeWallet();
  }
  return wallet;
};

export default getWallet();
