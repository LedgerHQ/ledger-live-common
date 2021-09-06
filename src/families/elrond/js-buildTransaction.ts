import type { Transaction } from "./types";
import type { Account, SubAccount } from "../../types";
import { getNonce } from "./logic";
import { getNetworkConfig } from "./api";
import { HASH_TRANSACTION, RAW_TRANSACTION } from "./constants";
import getEstimatedFees from "./js-getFeesForTransaction";
import BigNumber from "bignumber.js";

/**
 *
 * @param {Account} a
 * @param {Transaction} t
 */
export const buildTransaction = async (
  a: Account,
  ta: SubAccount | null | undefined,
  t: Transaction,
  signUsingHash = true
) => {
  const address = a.freshAddress;
  const nonce = getNonce(a);
  const { gasPrice, gasLimit, chainId } = await getNetworkConfig();
  const transactionType = signUsingHash ? HASH_TRANSACTION : RAW_TRANSACTION;
  let data;
  if (ta) {
    const tokenIdentifier = Buffer.from(ta.id.split('/')[2], 'hex').toString();
    data = `ESDTTransfer@${tokenIdentifier}@${t.amount}`;
  }

  const unsigned = {
    nonce,
    value: ta ? new BigNumber(0): t.useAllAmount ? a.spendableBalance :  t.amount,
    receiver: t.recipient,
    sender: address,
    gasPrice,
    gasLimit,
    chainID: chainId,
    data: data,
    ...transactionType,
  };
  // Will likely be a call to Elrond SDK
  return JSON.stringify(unsigned);
};
