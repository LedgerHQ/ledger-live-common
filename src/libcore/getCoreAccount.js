// @flow
import type { Account } from "../types";
import type { Core, CoreWallet, CoreAccount } from "./types";
import { getWalletName } from "../account";
import { getOrCreateWallet } from "./getOrCreateWallet";

export const getCoreAccount = async (
  core: Core,
  account: Account
): Promise<{
  coreWallet: CoreWallet,
  coreAccount: CoreAccount,
  walletName: string
}> => {
  const { currency, derivationMode, seedIdentifier, index } = account;

  const walletName = getWalletName({
    currency,
    seedIdentifier,
    derivationMode
  });

  const coreWallet = await getOrCreateWallet({
    core,
    walletName,
    currency,
    derivationMode
  });

  const coreAccount = await coreWallet.getAccount(index);

  return { walletName, coreWallet, coreAccount };
};
