import BigNumber from "bignumber.js";
import {
  getBipPath,
  getExtendedPublicKeyFromHex,
  getCredentialKey,
} from "../logic";
import {
  CardanoOutput,
  CardanoResources,
  PaymentChain,
  PaymentCredential,
  StakeChain,
} from "../types";
import _ from "lodash";
import { Bip32PublicKey } from "@stricahq/bip32ed25519";
import { getEnv } from "../../../env";
import { STAKING_ADDRESS_INDEX, CARDANO_API_ENDPOINT } from "../constants";
import network from "../../../network";

async function getUtxosByPaymentKeys(
  paymentKeyList: Array<string>
): Promise<Array<CardanoOutput>> {
  const res = await network({
    method: "GET",
    url: `${CARDANO_API_ENDPOINT}/v1/utxo`,
    params: {
      paymentKeys: paymentKeyList,
    },
  });
  return (res.data.utxos as Array<Record<string, unknown>>).map((u) => {
    const [hash, index] = (u.trx as string).split("#");
    return {
      hash,
      index: parseInt(index),
      address: u.address as string,
      amount: new BigNumber(u.amount as string),
      tokens: (u.tokens as Array<Record<string, unknown>>).map((t) => ({
        assetName: t.assetName as string,
        policyId: t.policyId as string,
        amount: new BigNumber(t.value as string),
      })),
      paymentCredential: {
        key: (u.paymentCredential as Record<string, unknown>).key as string,
      },
      stakeCredential: u.stakeCredential
        ? {
            key: (u.stakeCredential as Record<string, unknown>).key as string,
          }
        : undefined,
    };
  });
}

async function getUsedPaymentKeys(
  paymentKeyList: Array<string>
): Promise<Array<string>> {
  const res = await network({
    method: "GET",
    url: `${CARDANO_API_ENDPOINT}/v1/address/paymentKey/used`,
    params: {
      paymentKeys: paymentKeyList,
    },
  });
  return res.data.paymentKeys as Array<string>;
}

async function getSyncedPaymentCredentialAndUtxo(
  account: {
    key: Bip32PublicKey;
    index: number;
  },
  chainType: PaymentChain
): Promise<{
  paymentCredentials: Array<PaymentCredential>;
  utxos: Array<CardanoOutput>;
}> {
  let isSynced = false;
  const keyChainRange = getEnv("KEYCHAIN_OBSERVABLE_RANGE") || 20;
  const paymentCredentialsMap: Record<string, PaymentCredential> = {};
  let fetchedRounds = 0;
  while (!isSynced) {
    let newPaymentKeys: Array<string> = [];

    for (
      let index = fetchedRounds * keyChainRange;
      index < (fetchedRounds + 1) * keyChainRange;
      index++
    ) {
      const paymentCredentialKey = getCredentialKey(
        account.key,
        getBipPath({ account: account.index, chain: chainType, index })
      );
      newPaymentKeys.push(paymentCredentialKey.key);
      paymentCredentialsMap[paymentCredentialKey.key] = {
        isUsed: false,
        key: paymentCredentialKey.key,
        bipPath: paymentCredentialKey.path,
      };
    }
    const usedPaymentKeys = await getUsedPaymentKeys(newPaymentKeys);
    usedPaymentKeys.forEach(
      (key) => (paymentCredentialsMap[key].isUsed = true)
    );

    newPaymentKeys = [];
    isSynced = usedPaymentKeys.length === 0;
    fetchedRounds += 1;
  }

  const paymentCredentials = Object.values(paymentCredentialsMap);
  const usedPaymentKeys = paymentCredentials.reduce(
    (paymentKeys, paymentCred) => {
      if (paymentCred.isUsed) {
        paymentKeys.push(paymentCred.key);
      }
      return paymentKeys;
    },
    [] as Array<string>
  );

  const usedPaymentKeysChunk = _(usedPaymentKeys).chunk(30).value();
  const utxos = await Promise.all(
    usedPaymentKeysChunk.map(getUtxosByPaymentKeys)
  );

  return {
    paymentCredentials: paymentCredentials,
    utxos: utxos.flat().map((u) => {
      u.paymentCredential.bipPath =
        paymentCredentialsMap[u.paymentCredential.key].bipPath;
      return u;
    }),
  };
}

export async function getCardanoResourseForAccount({
  xpub,
  accountIndex,
}: {
  xpub: string;
  accountIndex: number;
}): Promise<CardanoResources> {
  const accountPubKey = getExtendedPublicKeyFromHex(xpub);
  const {
    paymentCredentials: externalPaymentCredentials,
    utxos: externalUtxos,
  } = await getSyncedPaymentCredentialAndUtxo(
    { key: accountPubKey, index: accountIndex },
    PaymentChain.external
  );
  const {
    paymentCredentials: internalPaymentCredentials,
    utxos: internalUtxos,
  } = await getSyncedPaymentCredentialAndUtxo(
    { key: accountPubKey, index: accountIndex },
    PaymentChain.internal
  );
  const stakeCredential = getCredentialKey(
    accountPubKey,
    getBipPath({
      account: accountIndex,
      chain: StakeChain.stake,
      index: STAKING_ADDRESS_INDEX,
    })
  );

  return {
    internalCredentials: _(internalPaymentCredentials)
      .sortBy((cred) => cred.bipPath.index)
      .value(),
    externalCredentials: _(externalPaymentCredentials)
      .sortBy((cred) => cred.bipPath.index)
      .value(),
    stakeCredential: {
      key: stakeCredential.key,
      bipPath: stakeCredential.path,
    },
    utxos: _([...internalUtxos, ...externalUtxos])
      .uniqBy((u) => `${u.hash}${u.index}`)
      .value(),
  };
}
