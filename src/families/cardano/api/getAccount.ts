import BigNumber from "bignumber.js";
import {
  getBipPath,
  getExtendedPublicKeyFromHex,
  getCredentialKey,
} from "../helpers";
import {
  CardanoOutput,
  CardanoResources,
  PaymentChain,
  PaymentCredential,
} from "../types";
import _ from "lodash";
import { Bip32PublicKey } from "@stricahq/bip32ed25519";
import { getEnv } from "../../../env";
import axios from "./axios";

async function getUtxosByPaymentKeys(
  paymentKeyList: Array<string>
): Promise<Array<CardanoOutput>> {
  const res = await axios.get("/v1/utxo", {
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
        value: new BigNumber(t.value as string),
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
  const paymentCredentials: Record<string, PaymentCredential> = {};
  const utxos: Array<CardanoOutput> = [];
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
      paymentCredentials[paymentCredentialKey.key] = {
        isUsed: false,
        key: paymentCredentialKey.key,
        bipPath: paymentCredentialKey.path,
      };
    }
    const newUtxos = await getUtxosByPaymentKeys(newPaymentKeys);
    newUtxos.forEach((u) => {
      const paymentKey = u.paymentCredential.key;
      u.paymentCredential.bipPath = paymentCredentials[paymentKey].bipPath;
      paymentCredentials[paymentKey].isUsed = true;
      utxos.push(...newUtxos);
    });

    newPaymentKeys = [];
    isSynced = newUtxos.length === 0;
    fetchedRounds += 1;
  }
  return { paymentCredentials: Object.values(paymentCredentials), utxos };
}

// TODO: return bech32 address
// function getBech32ReceiveAddress(
//   paymentCred: PaymentCredential,
//   stakeCred: StakeCredential
// ) {
//   return `${paymentCred.key}${stakeCred.key}`;
// }

export async function getCardanoResourseForAccount({
  xpub,
  accountIndex,
}: {
  xpub: string;
  accountIndex: number;
}): Promise<CardanoResources> {
  const accountPubKey = getExtendedPublicKeyFromHex(xpub);
  const {
    paymentCredentials: externalPaymentCredential,
    utxos: externalUtxos,
  } = await getSyncedPaymentCredentialAndUtxo(
    { key: accountPubKey, index: accountIndex },
    PaymentChain.external
  );
  const {
    paymentCredentials: internalPaymentCredential,
    utxos: internalUtxos,
  } = await getSyncedPaymentCredentialAndUtxo(
    { key: accountPubKey, index: accountIndex },
    PaymentChain.internal
  );

  // const stakeCredentialKey = getCredentialKey(
  //   accountPubKey,
  //   getBipPath({
  //     account: accountIndex,
  //     chain: StakeChain.stake,
  //     index: STAKING_ADDRESS_INDEX,
  //   })
  // );
  // const stakeCredential: StakeCredential = {
  //   key: stakeCredentialKey.key,
  //   bipPath: stakeCredentialKey.path,
  // };

  // const freshAddresses: Array<Address> = externalCredentials
  //   .filter((cred) => !cred.isUsed)
  //   .map((cred) => {
  //     return {
  //       address: getBech32ReceiveAddress(cred, stakeCredential),
  //       derivationPath: getBipPathString({
  //         account: cred.bipPath.account,
  //         chain: cred.bipPath.chain,
  //         index: cred.bipPath.index,
  //       }),
  //     };
  //   });

  return {
    internalCredentials: _(internalPaymentCredential)
      .sortBy((cred) => cred.bipPath.index)
      .value(),
    externalCredentials: _(externalPaymentCredential)
      .sortBy((cred) => cred.bipPath.index)
      .value(),
    utxos: _([...internalUtxos, ...externalUtxos])
      .uniqBy((u) => `${u.hash}${u.index}`)
      .value(),
  };
}
