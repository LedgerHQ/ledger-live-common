import type { Account, Operation } from "../../types";
import {
  GetAccountShape,
  makeScanAccounts,
  mergeOps,
} from "../../bridge/jsHelpers";
import { makeSync } from "../../bridge/jsHelpers";
import { encodeAccountId } from "../../account";

import BigNumber from "bignumber.js";
import Ada from "@cardano-foundation/ledgerjs-hw-app-cardano";
import { str_to_path } from "@cardano-foundation/ledgerjs-hw-app-cardano/dist/utils";
import { utils as TyphonUtils } from "@stricahq/typhonjs";
import { APITransaction } from "./api/api-types";
import { CardanoOutput, PaymentCredential } from "./types";
import uniqBy from "lodash/uniqBy";
import {
  getAbsoluteSlot,
  getAccountStakeCredential,
  getBaseAddress,
  getBipPathString,
  getOperationType,
} from "./logic";
import { encodeOperationId } from "../../operation";
import { getOperations } from "./api/getOperations";

const postSync = (initial: Account, parent: Account) => parent;

function getAccountChange(
  t: APITransaction,
  accountCredentialsMap: Record<string, PaymentCredential>
) {
  const accountInput = t.inputs.reduce(
    (total, i) =>
      (total = accountCredentialsMap[i.paymentKey]
        ? total.plus(i.value)
        : total.plus(0)),
    new BigNumber(0)
  );

  const accountOutput = t.outputs.reduce(
    (total, o) =>
      (total = accountCredentialsMap[o.paymentKey]
        ? total.plus(o.value)
        : total.plus(0)),
    new BigNumber(0)
  );

  return accountOutput.minus(accountInput);
}

function mapApiTxToOperation(
  t: APITransaction,
  accountId: string,
  accountCredentialsMap: Record<string, PaymentCredential>
): Operation {
  const accountChange = getAccountChange(t, accountCredentialsMap);
  const operationType = getOperationType({
    accountChange,
    fees: new BigNumber(t.fees),
  });
  return {
    accountId,
    id: encodeOperationId(accountId, t.hash, operationType),
    hash: t.hash,
    type: operationType,
    fee: new BigNumber(t.fees),
    value: accountChange.absoluteValue(),
    senders: t.inputs.map((i) =>
      TyphonUtils.getAddressFromHex(i.address).getBech32()
    ),
    recipients: t.outputs.map((o) =>
      TyphonUtils.getAddressFromHex(o.address).getBech32()
    ),
    blockHeight: t.blockHeight,
    date: new Date(t.timestamp),
    extra: {
      absoluteSlot: t.absSlot,
    },
    blockHash: undefined,
  };
}

function filterUtxos(
  newTransactions: Array<APITransaction>,
  oldUtxos: Array<CardanoOutput>,
  accountCredentialsMap: Record<string, PaymentCredential>
): Array<CardanoOutput> {
  const newUtxos: Array<CardanoOutput> = [];
  const spentUtxoKeys: Set<string> = new Set();

  newTransactions.forEach((t) => {
    t.inputs.forEach((i) => {
      const cred = accountCredentialsMap[i.paymentKey];
      if (cred) spentUtxoKeys.add(`${i.txId}#${i.index}`);
    });

    t.outputs.forEach((o, outputIndex) => {
      const cred = accountCredentialsMap[o.paymentKey];
      if (cred) {
        newUtxos.push({
          hash: t.hash,
          index: outputIndex,
          address: o.address,
          amount: new BigNumber(o.value),
          tokens: o.tokens.map((token) => ({
            assetName: token.assentName,
            policyId: token.policyId,
            amount: new BigNumber(token.value),
          })),
          paymentCredential: {
            key: o.paymentKey,
            path: cred.path,
          },
        });
      }
    });
  });

  const utxos = uniqBy(
    [...oldUtxos, ...newUtxos],
    (u) => `${u.hash}#${u.index}`
  ).filter((u) => !spentUtxoKeys.has(`${u.hash}#${u.index}`));

  return utxos;
}

export const getAccountShape: GetAccountShape = async (info) => {
  const {
    transport,
    currency,
    index: accountIndex,
    derivationPath,
    derivationMode,
    initialAccount,
  } = info;
  // In case we get a full derivation path
  const rootPath = derivationPath.split("/", 2).join("/");
  const accountPath = `${rootPath}/${accountIndex}'`;

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

  const requiredConfirmations = 90;
  const syncFromAbsoluteSlot = initialAccount
    ? getAbsoluteSlot("cardano_testnet", initialAccount.lastSyncDate) -
      (currency.blockAvgTime || 20) * requiredConfirmations
    : 0;
  const {
    transactions: newTransactions,
    blockHeight,
    externalCredentials,
    internalCredentials,
  } = await getOperations(
    xpub,
    accountIndex,
    initialAccount,
    syncFromAbsoluteSlot
  );

  const accountCredentialsMap = [
    ...externalCredentials,
    ...internalCredentials,
  ].reduce((finalMap, cred) => {
    finalMap[cred.key] = cred;
    return finalMap;
  }, {} as Record<string, PaymentCredential>);

  const safeOldOperationsIds = {};
  (initialAccount?.operations || []).forEach((o) => {
    if (o.extra.absoluteSlot < syncFromAbsoluteSlot) {
      safeOldOperationsIds[o.hash] = o;
    }
  });

  const oldUtxos = (initialAccount?.cardanoResources?.utxos || []).filter(
    (u) => safeOldOperationsIds[u.hash]
  );
  const utxos = filterUtxos(newTransactions, oldUtxos, accountCredentialsMap);

  const newOperations = newTransactions.map((t) =>
    mapApiTxToOperation(t, accountId, accountCredentialsMap)
  );
  const operations = mergeOps(
    Object.values(safeOldOperationsIds),
    newOperations
  );

  const stakeCredential = getAccountStakeCredential(xpub, accountIndex);
  const freshAddresses = externalCredentials
    .filter((c) => !c.isUsed)
    .map((c) => ({
      derivationPath: getBipPathString(c.path),
      address: getBaseAddress({
        paymentCred: c,
        stakeCred: stakeCredential,
      }).getBech32(),
    }));

  const balance = utxos.reduce(
    (total, u) => total.plus(u.amount),
    new BigNumber(0)
  );

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
    cardanoResources: {
      utxos,
      externalCredentials,
      internalCredentials,
    },
  };
};

export const scanAccounts = makeScanAccounts(getAccountShape);

export const sync = makeSync(getAccountShape, postSync);
