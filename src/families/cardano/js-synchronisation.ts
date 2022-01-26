import type { Account } from "../../types";
import { GetAccountShape, makeScanAccounts } from "../../bridge/jsHelpers";
import { makeSync } from "../../bridge/jsHelpers";
import { encodeAccountId } from "../../account";

import BigNumber from "bignumber.js";
import Ada from "@cardano-foundation/ledgerjs-hw-app-cardano";
import { str_to_path } from "@cardano-foundation/ledgerjs-hw-app-cardano/dist/utils";
import { getCardanoResourseForAccount } from "./api/getAccount";

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

  const balance = cardanoResources.utxos.reduce(
    (sum, u) => sum.plus(u.amount),
    new BigNumber(0)
  );
  const blockHeight = 0;

  const operations = [];
  return {
    id: accountId,
    xpub,
    balance,
    spendableBalance: balance,
    operations,
    operationsCount: operations.length,
    freshAddress: "",
    freshAddressPath: `${accountPath}/0/0`,
    blockHeight,
    cardanoResources,
  };
};

export const scanAccounts = makeScanAccounts(getAccountShape);

export const sync = makeSync(getAccountShape, postSync);
