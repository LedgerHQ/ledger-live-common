import type { Transaction } from "./types";
import type { Account, SubAccount } from "../../types";
import { getNonce } from "./logic";
import { getNetworkConfig } from "./api";
import { HASH_TRANSACTION, RAW_TRANSACTION } from "./constants";
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
  let { gasPrice, gasLimit, chainId } = await getNetworkConfig();
  const transactionType = signUsingHash ? HASH_TRANSACTION : RAW_TRANSACTION;
  let data;
  if (ta) {
    const tokenIdentifierHex = ta.id.split('/')[2];
    data = Buffer.from(`ESDTTransfer@${tokenIdentifierHex}@${t.amount.toString(16)}`).toString('base64');
    t.amount = new BigNumber(0); //amount of EGLD to be sent should be 0
    t.data = data;
    gasLimit = 600000; //gasLimit for and ESDT transfer
  }

  const unsigned = {
    nonce,
    value: t.useAllAmount
      ? a.balance.minus(t.fees ? t.fees : new BigNumber(0))
      : t.amount,
    receiver: t.recipient,
    sender: address,
    gasPrice,
    gasLimit,
    data: data,
    chainID: chainId,
    ...transactionType,
  };
  // Will likely be a call to Elrond SDK
  return JSON.stringify(unsigned);
};
