import { EthereumTransaction as PlatformTransaction } from "@ledgerhq/live-app-sdk";
import { Transaction } from "./types";

export const CAN_EDIT_FEES = true;

export const areFeesProvided = (tx: PlatformTransaction): boolean =>
  !!(tx.gasLimit || tx.gasPrice);

export const convertToLiveTransaction = (
  tx: PlatformTransaction
): Partial<Transaction> => {
  const hasFeesProvided = areFeesProvided(tx);

  const { gasLimit, ...restTx } = tx;

  const liveTx: Partial<Transaction> = {
    ...restTx,
    amount: tx.amount,
    recipient: tx.recipient,
    gasPrice: tx.gasPrice,
    userGasLimit: gasLimit,
  };

  return hasFeesProvided ? { ...liveTx, feesStrategy: "custom" } : liveTx;
};
