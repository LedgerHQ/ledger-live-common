import {
  CardanoOutput,
  CardanoResources,
  PaymentChain,
  Transaction,
} from "./types";
import type { Account } from "../../types";
import {
  Transaction as TyphonTransaction,
  types as TyphonTypes,
  utils as TyphonUtils,
} from "@stricahq/typhonjs";
import BigNumber from "bignumber.js";
import {
  getBaseAddress,
  getBipPath,
  getCredentialKey,
  getExtendedPublicKeyFromHex,
  getTTL,
} from "./logic";
import { getCurrentCardanoPreloadData, hydrate, preload } from "./preload";

/**
 *
 * @param {Account} a
 * @param {Transaction} t
 *
 * @returns {TyphonTransaction}
 */
export const buildTransaction = async (
  a: Account,
  t: Transaction
): Promise<TyphonTransaction> => {
  let cardanoPreloadedData = getCurrentCardanoPreloadData();
  //TODO: confirm this code
  if (cardanoPreloadedData == undefined) {
    cardanoPreloadedData = await preload();
    hydrate(cardanoPreloadedData);
  }
  const transaction = new TyphonTransaction({
    protocolParams: {
      minFeeA: new BigNumber(cardanoPreloadedData.protocolParams.minFeeA),
      minFeeB: new BigNumber(cardanoPreloadedData.protocolParams.minFeeB),
      stakeKeyDeposit: new BigNumber(
        cardanoPreloadedData.protocolParams.stakeKeyDeposit
      ),
      lovelacePerUtxoWord: new BigNumber(
        cardanoPreloadedData.protocolParams.lovelacePerUtxoWord
      ),
      collateralPercent: new BigNumber(
        cardanoPreloadedData.protocolParams.collateralPercent
      ),
      priceSteps: new BigNumber(cardanoPreloadedData.protocolParams.priceSteps),
      priceMem: new BigNumber(cardanoPreloadedData.protocolParams.priceMem),
      languageView: cardanoPreloadedData.protocolParams.languageView,
    },
  });

  // TODO:CARDANO add tokens support
  const receiverOutput: TyphonTypes.Output = {
    address: TyphonUtils.getAddressFromBech32(t.recipient),
    amount: t.amount,
    tokens: [],
  };

  const cardanoResources = a.cardanoResources as CardanoResources;

  const unusedInternalCred = cardanoResources.internalCredentials.find(
    (cred) => !cred.isUsed
  );

  let changeAddress;
  if (unusedInternalCred) {
    changeAddress = getBaseAddress({
      paymentCred: unusedInternalCred,
      stakeCred: cardanoResources.stakeCredential,
    });
  } else {
    // create new internalCred if there's no unusedCred present in internalCredentials
    const accountPubKey = getExtendedPublicKeyFromHex(a.xpub as string);
    const paymentKey = getCredentialKey(
      accountPubKey,
      getBipPath({
        account: a.index,
        chain: PaymentChain.internal,
        index: cardanoResources.internalCredentials.length,
      })
    );
    changeAddress = getBaseAddress({
      paymentCred: {
        key: paymentKey.key,
        bipPath: paymentKey.path,
        isUsed: false,
      },
      stakeCred: cardanoResources.stakeCredential,
    });
  }

  transaction.addOutput(receiverOutput);

  // sorting utxo from higher to lower ADA value
  // to minimize the number of utxo use in transaction
  const sortedUtxos = cardanoResources.utxos.sort((a, b) => {
    const diff = b.amount.minus(a.amount);
    return diff.eq(0) ? 0 : diff.lt(0) ? -1 : 1;
  });

  const transactionInputs: Array<TyphonTypes.Input> = [];
  const usedUtxoAdaAmount = new BigNumber(0);

  for (
    let i = 0;
    i < sortedUtxos.length && usedUtxoAdaAmount.lte(t.amount);
    i++
  ) {
    const utxo = sortedUtxos[i] as CardanoOutput;
    const address = TyphonUtils.getAddressFromHex(
      utxo.address
    ) as TyphonTypes.ShelleyAddress;
    if (address.paymentCredential.type === TyphonTypes.HashType.ADDRESS) {
      address.paymentCredential.bipPath = utxo.paymentCredential.bipPath;
    }
    const transactionInput = {
      txId: utxo.hash,
      index: utxo.index,
      amount: new BigNumber(utxo.amount),
      tokens: utxo.tokens,
      address: address,
    };
    transactionInputs.push(transactionInput);
    usedUtxoAdaAmount.plus(transactionInput.amount);
  }

  const ttl = getTTL();
  transaction.setTTL(ttl);

  return transaction.prepareTransaction({
    inputs: transactionInputs,
    changeAddress,
  });
};
