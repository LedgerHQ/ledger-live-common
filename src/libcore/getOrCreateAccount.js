// @flow
import invariant from "invariant";
import { log } from "@ledgerhq/logs";
import type { Account } from "../types";
import { atomicQueue } from "../promise";
import type { Core, CoreWallet, CoreAccount } from "./types";
import { isNonExistingAccountError } from "./errors";

type Param = {
  core: Core,
  coreWallet: CoreWallet,
  account: Account
};
type F = Param => Promise<CoreAccount>;

const restoreWithAccountCreationInfo = {
  tezos: true
};

export const getOrCreateAccount: F = atomicQueue(
  async ({ core, coreWallet, account: { xpub, currency } }) => {
    log("libcore", "getOrCreateAccount", { xpub });
    let coreAccount;
    try {
      coreAccount = await coreWallet.getAccount(0);
    } catch (err) {
      if (!isNonExistingAccountError(err)) {
        throw err;
      }
      log("libcore", "no account existed. restoring...");
      invariant(xpub, "xpub is missing. Please reimport the account.");

      if (restoreWithAccountCreationInfo[currency.id]) {
        const accountCreationInfos = await coreWallet.getAccountCreationInfo(0);
        const chainCodes = await accountCreationInfos.getChainCodes();
        const publicKeys = await accountCreationInfos.getPublicKeys();
        const derivations = await accountCreationInfos.getDerivations();
        const owners = await accountCreationInfos.getOwners();
        publicKeys.push(xpub);
        log("libcore", "AccountCreationInfo.init", {
          owners,
          derivations,
          publicKeys,
          chainCodes
        });
        const newAccountCreationInfos = await core.AccountCreationInfo.init(
          0,
          owners,
          derivations,
          publicKeys,
          chainCodes
        );
        const account = await coreWallet.newAccountWithInfo(
          newAccountCreationInfos
        );
        return account;
      } else {
        const extendedInfos = await coreWallet.getExtendedKeyAccountCreationInfo(
          0
        );
        const infosIndex = await extendedInfos.getIndex();
        const extendedKeys = await extendedInfos.getExtendedKeys();
        const owners = await extendedInfos.getOwners();
        const derivations = await extendedInfos.getDerivations();
        extendedKeys.push(xpub);
        const newExtendedKeys = await core.ExtendedKeyAccountCreationInfo.init(
          infosIndex,
          owners,
          derivations,
          extendedKeys
        );
        const account = await coreWallet.newAccountWithExtendedKeyInfo(
          newExtendedKeys
        );
        return account;
      }
    }
    return coreAccount;
  },
  ({ account }) => account.id || ""
);
