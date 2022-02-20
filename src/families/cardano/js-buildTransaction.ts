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
  getTokenDiff,
  getTTL,
} from "./logic";
import { getCurrentCardanoPreloadData, hydrate, preload } from "./preload";

function getTyphonInputFromUtxo(utxo: CardanoOutput): TyphonTypes.Input {
  const address = TyphonUtils.getAddressFromHex(
    utxo.address
  ) as TyphonTypes.ShelleyAddress;
  if (address.paymentCredential.type === TyphonTypes.HashType.ADDRESS) {
    address.paymentCredential.bipPath = utxo.paymentCredential.bipPath;
  }
  return {
    txId: utxo.hash,
    index: utxo.index,
    amount: new BigNumber(utxo.amount),
    tokens: utxo.tokens,
    address: address,
  };
}

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

  const cardanoResources = a.cardanoResources as CardanoResources;

  const unusedInternalCred = cardanoResources.internalCredentials.find(
    (cred) => !cred.isUsed
  );

  const receiverAddress = TyphonUtils.getAddressFromBech32(t.recipient);
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

  const ttl = getTTL();
  transaction.setTTL(ttl);

  if (t.useAllAmount) {
    // add all utxo as input
    cardanoResources.utxos.forEach((u) =>
      transaction.addInput(getTyphonInputFromUtxo(u))
    );

    const tokenBalance = cardanoResources.utxos.map((u) => u.tokens).flat();
    const tokensToKeep = getTokenDiff(tokenBalance, []); // TODO: support tokens

    // if account holds any tokens then send it to changeAddress with
    // minimum required ADA to spend it
    if (tokensToKeep.length) {
      const minAmountToSpendTokens = TyphonUtils.calculateMinUtxoAmount(
        tokensToKeep,
        new BigNumber(cardanoPreloadedData.protocolParams.lovelacePerUtxoWord),
        false
      );
      transaction.addOutput({
        address: changeAddress,
        amount: minAmountToSpendTokens,
        tokens: tokensToKeep,
      });
    }

    return transaction.prepareTransaction({
      inputs: [],
      changeAddress: receiverAddress,
    });
  }

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
    const utxo = sortedUtxos[i];
    const transactionInput = getTyphonInputFromUtxo(utxo);
    transactionInputs.push(transactionInput);
    usedUtxoAdaAmount.plus(transactionInput.amount);
  }

  transaction.addOutput({
    address: receiverAddress,
    amount: t.amount,
    tokens: [], //TODO: support tokens
  });

  return transaction.prepareTransaction({
    inputs: transactionInputs,
    changeAddress,
  });
};
