import type { Account, Address } from "../../types";
import { GetAccountShape, makeScanAccounts } from "../../bridge/jsHelpers";
import { makeSync } from "../../bridge/jsHelpers";
import { encodeAccountId } from "../../account";

import BigNumber from "bignumber.js";
import Ada from "@cardano-foundation/ledgerjs-hw-app-cardano";
import { str_to_path } from "@cardano-foundation/ledgerjs-hw-app-cardano/dist/utils";
import { getCardanoResourseForAccount } from "./api/getAccount";
import { getOperations } from "./api";
import {
  getBipPath,
  getBipPathString,
  getCredentialKey,
  getExtendedPublicKeyFromHex,
} from "./helpers";
import { PaymentCredential, StakeChain, StakeCredential } from "./types";
import { STAKING_ADDRESS_INDEX } from "./constants";

// TODO: return bech32 address
function getBech32ReceiveAddress(
  paymentCred: PaymentCredential,
  stakeCred: StakeCredential
) {
  return `${paymentCred.key}${stakeCred.key}`;
}

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
  const operations = await getOperations({ usedPaymentKeys, accountId });

  const balance = cardanoResources.utxos.reduce(
    (sum, u) => sum.plus(u.amount),
    new BigNumber(0)
  );

  // TODO: get latest blockHeight from API
  const blockHeight = 3277071;

  const accountPubKey = getExtendedPublicKeyFromHex(xpub);
  const stakeCredentialKey = getCredentialKey(
    accountPubKey,
    getBipPath({
      account: index,
      chain: StakeChain.stake,
      index: STAKING_ADDRESS_INDEX,
    })
  );
  const stakeCredential: StakeCredential = {
    key: stakeCredentialKey.key,
    bipPath: stakeCredentialKey.path,
  };

  const freshAddresses: Array<Address> = cardanoResources.externalCredentials
    .filter((cred) => !cred.isUsed)
    .map((cred) => {
      return {
        address: getBech32ReceiveAddress(cred, stakeCredential),
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
