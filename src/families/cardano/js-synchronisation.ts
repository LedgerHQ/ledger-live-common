import type { Account, Address } from "../../types";
import { GetAccountShape, makeScanAccounts } from "../../bridge/jsHelpers";
import { makeSync } from "../../bridge/jsHelpers";
import { encodeAccountId } from "../../account";

import BigNumber from "bignumber.js";
import Ada from "@cardano-foundation/ledgerjs-hw-app-cardano";
import { str_to_path } from "@cardano-foundation/ledgerjs-hw-app-cardano/dist/utils";
import { getCardanoResourseForAccount } from "./api/getAccount";
import { getOperations } from "./api";
import { getBaseAddress, getBipPathString } from "./logic";

const postSync = (initial: Account, parent: Account) => parent;

const getAccountShape: GetAccountShape = async (info) => {
  const {
    transport,
    currency,
    index,
    derivationPath,
    derivationMode,
    initialAccount,
  } = info;

  // In case we get a full derivation path
  const rootPath = derivationPath.split("/", 2).join("/");
  const accountPath = `${rootPath}/${index}'`;

  const paramXpub = initialAccount?.xpub;
  let extendedPubKeyRes;
  if (!paramXpub) {
    if (!transport) {
      // hwapp not provided
      throw new Error("hwapp required to generate the xpub");
    }
    const ada = new Ada(transport);
    extendedPubKeyRes = await ada.getExtendedPublicKey({
      path: str_to_path(accountPath),
    });
  }
  const xpub =
    paramXpub ||
    `${extendedPubKeyRes.publicKeyHex}${extendedPubKeyRes.chainCodeHex}`;

  const accountId = encodeAccountId({
    type: "js",
    version: "2",
    currencyId: currency.id,
    xpubOrAddress: xpub,
    derivationMode,
  });

  const cardanoResources = await getCardanoResourseForAccount({
    xpub,
    accountIndex: index,
  });
  const usedPaymentKeys = [
    ...cardanoResources.externalCredentials,
    ...cardanoResources.internalCredentials,
  ].map((cred) => cred.key);
  const { operations, blockHeight } = await getOperations({
    usedPaymentKeys,
    accountId,
  });

  const balance = cardanoResources.utxos.reduce(
    (sum, u) => sum.plus(u.amount),
    new BigNumber(0)
  );

  const freshAddresses: Array<Address> = cardanoResources.externalCredentials
    .filter((cred) => !cred.isUsed)
    .map((cred) => {
      return {
        address: getBaseAddress({
          paymentCred: cred,
          stakeCred: cardanoResources.stakeCredential,
        }).getBech32(),
        derivationPath: getBipPathString(cred.bipPath),
      };
    });

  return {
    id: accountId,
    xpub,
    balance,
    spendableBalance: balance,
    operations,
    freshAddresses,
    freshAddress: freshAddresses[0].address,
    freshAddressPath: freshAddresses[0].derivationPath,
    lastSyncDate: new Date(),
    blockHeight,
    cardanoResources,
  };
};

export const scanAccounts = makeScanAccounts(getAccountShape);

export const sync = makeSync(getAccountShape, postSync);
