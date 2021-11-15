import type { ElrondProtocolTransaction, NetworkInfo, Transaction } from "./types";
import type { Account, SubAccount } from "../../types";
import { encodeESDTTransfer, getNonce } from "./logic";
import { getNetworkConfig } from "./api";
import { ESDT_TRANSFER_GAS, HASH_TRANSACTION } from "./constants";
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
) => {
  const address = a.freshAddress;
  const nonce = getNonce(a);
  let { gasPrice, gasLimit, chainID }: NetworkInfo = await getNetworkConfig();

  if (ta) {
    t.data = encodeESDTTransfer(t, ta);
    t.amount = new BigNumber(0); //amount of EGLD to be sent should be 0 in an ESDT transafer
    gasLimit = ESDT_TRANSFER_GAS; //gasLimit for and ESDT transfer
  }

  const transactionValue = t.useAllAmount
  ? a.balance.minus(t.fees ? t.fees : new BigNumber(0))
  : t.amount;

  const unsigned: ElrondProtocolTransaction = {
    nonce,
    value: transactionValue.toString(),
    receiver: t.recipient,
    sender: address,
    gasPrice,
    gasLimit,
    data: t.data,
    chainID,
    ...HASH_TRANSACTION,
  };
  // Will likely be a call to Elrond SDK
  return JSON.stringify(unsigned);
};
