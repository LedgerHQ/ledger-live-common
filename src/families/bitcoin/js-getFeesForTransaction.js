// @flow
import { BigNumber } from "bignumber.js";

import type { Account } from "./../../types";
import type { Transaction, BitcoinInput, BitcoinOutput } from "./types";
import { buildTransaction } from "./js-buildTransation";
import { perCoinLogic } from "./logic";

export type EstimatedFees = {
  fees: BigNumber,
  txInputs: BitcoinInput[],
  txOutputs: BitcoinOutput[],
};
const getFeesForTransaction = async ({
  account,
  transaction,
}: {
  account: Account,
  transaction: Transaction,
}): Promise<EstimatedFees> => {
  console.log("XXX - getFeesForTransaction - START");

  const walletTx = await buildTransaction(account, transaction);

  const fees = new BigNumber(walletTx.fee).integerValue();

  let txInputs: BitcoinInput[] = walletTx.inputs.map((i) => {
    return {
      address: i.address,
      value: new BigNumber(i.value),
      previousTxHash: i.output_hash,
      previousOutputIndex: i.output_index,
    };
  });

  let txOutputs: BitcoinOutput[] = walletTx.outputs.map((o) => {
    return {
      outputIndex: walletTx.outputs.indexOf(o),
      address: o.address,
      isChange: o.isChange,
      value: new BigNumber(o.value), // OK
    };
  });

  const perCoin = perCoinLogic[account.currency.id];
  if (perCoin) {
    const { syncReplaceAddress } = perCoin;
    if (syncReplaceAddress) {
      txInputs = txInputs.map((i) => ({
        ...i,
        address: i.address && syncReplaceAddress(i.address),
      }));
      txOutputs = txOutputs.map((o) => ({
        ...o,
        address: o.address && syncReplaceAddress(o.address),
      }));
    }
  }

  console.log("XXX - getFeesForTransaction - END");
  return { fees, txInputs, txOutputs };
};

export default getFeesForTransaction;
