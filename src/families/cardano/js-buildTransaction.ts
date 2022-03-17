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
  getAccountStakeCredential,
  getBaseAddress,
  getBipPath,
  getCredentialKey,
  getExtendedPublicKeyFromHex,
  getTokenDiff,
  getTTL,
} from "./logic";
import { getCurrentCardanoPreloadData } from "./preload";
import { getNetworkParameters } from "./networks";

function getTyphonInputFromUtxo(utxo: CardanoOutput): TyphonTypes.Input {
  const address = TyphonUtils.getAddressFromHex(
    utxo.address
  ) as TyphonTypes.ShelleyAddress;
  if (address.paymentCredential.type === TyphonTypes.HashType.ADDRESS) {
    address.paymentCredential.bipPath = utxo.paymentCredential.path;
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
  const cardanoPreloadedData = getCurrentCardanoPreloadData();

  const cardanoResources = a.cardanoResources as CardanoResources;
  // TODO: remove fix currencyId cardano_testnet
  // const networkParams = getNetworkParameters(account.currency.id);
  const networkParams = getNetworkParameters("cardano_testnet");

  const unusedInternalCred = cardanoResources.internalCredentials.find(
    (cred) => !cred.isUsed
  );
  const stakeCredential = getAccountStakeCredential(a.xpub as string, a.index);

  const receiverAddress = TyphonUtils.getAddressFromBech32(t.recipient);
  let changeAddress;
  if (unusedInternalCred) {
    changeAddress = getBaseAddress({
      networkId: networkParams.networkId,
      paymentCred: unusedInternalCred,
      stakeCred: stakeCredential,
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
      networkId: networkParams.networkId,
      paymentCred: {
        key: paymentKey.key,
        path: paymentKey.path,
        isUsed: false,
      },
      stakeCred: stakeCredential,
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

  const metadata: Array<TyphonTypes.Metadata> = [];
  if (t.memo) {
    metadata.push({
      label: 674,
      data: new Map([["msg", [t.memo]]]),
    });
  }

  if (metadata.length) {
    transaction.setAuxiliaryData({ metadata });
  }

  //TODO: remove fixed cardano_testnet
  // const ttl = getTTL(a.currency.id);
  const ttl = getTTL("cardano_testnet");
  transaction.setTTL(ttl);

  if (t.useAllAmount) {
    // add all utxo as input
    cardanoResources.utxos.forEach((u) =>
      transaction.addInput(getTyphonInputFromUtxo(u))
    );

    const tokenBalance = cardanoResources.utxos.map((u) => u.tokens).flat();
    const tokensToKeep = getTokenDiff(tokenBalance, []); // TODO: support tokens

    // if account holds any tokens then add it to changeAddress,
    // with minimum required ADA to spend those tokens
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
  // Add 5 ADA as buffer for utxo selection to cover the transaction fees.
  const requiredInputAmount = t.amount.plus(5e6);
  for (
    let i = 0;
    i < sortedUtxos.length && usedUtxoAdaAmount.lte(requiredInputAmount);
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
