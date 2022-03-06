import network from "../../../network";
import { CARDANO_API_ENDPOINT } from "../constants";
import * as ApiTypes from "./api-types";
import { Bip32PublicKey } from "@stricahq/bip32ed25519";
import { PaymentChain, PaymentCredential } from "../types";
import { getEnv } from "../../../env";
import {
  getBipPath,
  getCredentialKey,
  getExtendedPublicKeyFromHex,
} from "../logic";
import range from "lodash/range";
import chunk from "lodash/chunk";
import { Account } from "../../../types";
import { APITransaction } from "./api-types";

async function fetchTransactions(
  paymentKeys: Array<string>,
  pageNo: number,
  absSlot: number
): Promise<{
  pageNo: number;
  limit: number;
  blockHeight: number;
  transactions: Array<APITransaction>;
}> {
  const res = await network({
    method: "POST",
    url: `${CARDANO_API_ENDPOINT}/v1/transaction`,
    data: {
      paymentKeys,
      pageNo,
      absSlot: Math.max(absSlot, 0),
    },
  });
  return res.data;
}

async function getAllTransactionsByKeys(
  paymentKeys: Array<string>,
  absoluteSlot: number
): Promise<{
  transactions: Array<ApiTypes.APITransaction>;
  blockHeight: number;
}> {
  const transactions: Array<ApiTypes.APITransaction> = [];
  let latestBlockHeight = 0;
  let isAllTrxFetched = false;
  let pageNo = 1;

  while (!isAllTrxFetched) {
    const res = await fetchTransactions(paymentKeys, pageNo, absoluteSlot);
    transactions.push(...res.transactions);
    latestBlockHeight = Math.max(res.blockHeight, latestBlockHeight);
    isAllTrxFetched = res.transactions.length < res.limit;
    pageNo += 1;
  }
  return {
    transactions,
    blockHeight: latestBlockHeight,
  };
}

async function getSyncedTransactionsByChain(
  accountPubKey: Bip32PublicKey,
  accountIndex: number,
  chainType: PaymentChain,
  absoluteSlot: number,
  initialPaymentCredentials: Array<PaymentCredential>
): Promise<{
  transactions: Array<ApiTypes.APITransaction>;
  blockHeight: number;
  paymentCredentials: Array<PaymentCredential>;
}> {
  const keyChainRange = getEnv("KEYCHAIN_OBSERVABLE_RANGE") || 20;

  // credentialsMap for efficient use
  const initialPaymentCredentialMap: Record<string, PaymentCredential> = {};
  let maxUsedKeyIndex = -1;
  initialPaymentCredentials.forEach((cred) => {
    initialPaymentCredentialMap[cred.key] = cred;
    if (cred.isUsed) maxUsedKeyIndex = cred.path.index;
  });

  const transactions: Array<ApiTypes.APITransaction> = [];
  let latestBlockHeight = 0;

  // fetch transactions for existing keys
  const transactionsRes = await Promise.all(
    chunk(Object.keys(initialPaymentCredentialMap), keyChainRange).map((keys) =>
      getAllTransactionsByKeys(keys, absoluteSlot)
    )
  );
  transactionsRes.forEach((txRes) => {
    transactions.push(...txRes.transactions);
    latestBlockHeight = Math.max(latestBlockHeight, txRes.blockHeight);
  });

  // fetch transactions for new avaialble keys
  let newPaymentCredentialsMap: Record<string, PaymentCredential> = {};
  let lastSyncedKeyIndex = initialPaymentCredentials.length - 1;
  let syncToKeyIndex = maxUsedKeyIndex + keyChainRange;
  while (syncToKeyIndex !== lastSyncedKeyIndex) {
    const currentPaymentKeysMap: Record<string, PaymentCredential> = {};
    range(lastSyncedKeyIndex + 1, syncToKeyIndex + 1, 1).forEach((keyIndex) => {
      const keyPath = getCredentialKey(
        accountPubKey,
        getBipPath({
          account: accountIndex,
          chain: chainType,
          index: keyIndex,
        })
      );
      currentPaymentKeysMap[keyPath.key] = {
        isUsed: false,
        key: keyPath.key,
        path: keyPath.path,
      };
    });
    const { transactions: newTransactions, blockHeight } =
      await getAllTransactionsByKeys(
        Object.keys(currentPaymentKeysMap),
        absoluteSlot
      );
    transactions.push(...newTransactions);

    lastSyncedKeyIndex = syncToKeyIndex;
    latestBlockHeight = Math.max(latestBlockHeight, blockHeight);
    newPaymentCredentialsMap = Object.assign(
      {},
      newPaymentCredentialsMap,
      currentPaymentKeysMap
    );
    maxUsedKeyIndex = newTransactions.reduce(
      (maxIndexA, { inputs, outputs }) =>
        [...inputs, ...outputs].reduce(
          (maxIndexB, io) =>
            Math.max(
              newPaymentCredentialsMap[io.paymentKey]?.path.index || -1,
              maxIndexB
            ),
          maxIndexA
        ),
      maxUsedKeyIndex
    );
    syncToKeyIndex = maxUsedKeyIndex + keyChainRange;
  }

  const availablePaymentCredentialsMap = {
    ...initialPaymentCredentialMap,
    ...newPaymentCredentialsMap,
  };
  transactions.forEach((trx) => {
    [...trx.inputs, ...trx.outputs].forEach((io) => {
      if (availablePaymentCredentialsMap[io.paymentKey]) {
        availablePaymentCredentialsMap[io.paymentKey].isUsed = true;
      }
    });
  });

  return {
    transactions,
    blockHeight: latestBlockHeight,
    paymentCredentials: Object.values(availablePaymentCredentialsMap).sort(
      (aCred, bCred) => aCred.path.index - bCred.path.index
    ),
  };
}

export async function getOperations(
  xpub: string,
  accountIndex: number,
  initialAccount: Account | undefined,
  absoluteSlot: number
): Promise<{
  transactions: Array<ApiTypes.APITransaction>;
  blockHeight: number;
  externalCredentials: Array<PaymentCredential>;
  internalCredentials: Array<PaymentCredential>;
}> {
  const accountPubKey = getExtendedPublicKeyFromHex(xpub);
  const oldExternalCredentials =
    initialAccount?.cardanoResources?.externalCredentials || [];
  const oldInternalCredentials =
    initialAccount?.cardanoResources?.internalCredentials || [];

  const [
    {
      transactions: externalKeyTransactions,
      blockHeight: aBlockHeight,
      paymentCredentials: externalCredentials,
    },
    {
      transactions: internalKeyTransactions,
      blockHeight: bBlockHeight,
      paymentCredentials: internalCredentials,
    },
  ] = await Promise.all([
    getSyncedTransactionsByChain(
      accountPubKey,
      accountIndex,
      PaymentChain.external,
      absoluteSlot,
      oldExternalCredentials
    ),
    getSyncedTransactionsByChain(
      accountPubKey,
      accountIndex,
      PaymentChain.internal,
      absoluteSlot,
      oldInternalCredentials
    ),
  ]);

  return {
    transactions: [...externalKeyTransactions, ...internalKeyTransactions],
    blockHeight: Math.max(aBlockHeight, bBlockHeight),
    externalCredentials,
    internalCredentials,
  };
}
