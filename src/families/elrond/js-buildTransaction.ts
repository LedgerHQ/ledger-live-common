import type {
  ElrondProtocolTransaction,
  NetworkInfo,
  Transaction,
} from "./types";
import type { Account, SubAccount } from "../../types";
import { getNonce } from "./logic";
import { getNetworkConfig } from "./api";
import {
  GAS,
  HASH_TRANSACTION,
  MIN_DELEGATION_AMOUNT,
  MIN_DELEGATION_AMOUNT_DENOMINATED,
} from "./constants";
import BigNumber from "bignumber.js";
import { ElrondEncodeTransaction } from "./encode";
/**
 *
 * @param {Account} a
 * @param {Transaction} t
 */
export const buildTransaction = async (
  a: Account,
  ta: SubAccount | null | undefined,
  t: Transaction
): Promise<string> => {
  const address = a.freshAddress;
  const nonce = getNonce(a);
  const networkConfig: NetworkInfo = await getNetworkConfig();
  const { chainID, gasPrice } = networkConfig;
  let gasLimit = networkConfig.gasLimit;

  let transactionValue: BigNumber;

  if (ta) {
    t.data = ElrondEncodeTransaction.ESDTTransfer(t, ta);
    gasLimit = GAS.ESDT_TRANSFER; //gasLimit for and ESDT transfer

    transactionValue = new BigNumber(0); //amount of EGLD to be sent should be 0 in an ESDT transfer
  } else {
    transactionValue = t.useAllAmount
      ? a.balance.minus(t.fees ? t.fees : new BigNumber(0))
      : t.amount;

    switch (t.mode) {
      case "delegate":
        if (transactionValue.lt(MIN_DELEGATION_AMOUNT)) {
          throw new Error(
            `Delegation amount should be minimum ${MIN_DELEGATION_AMOUNT_DENOMINATED} EGLD`
          );
        }

        gasLimit = GAS.DELEGATE;
        t.data = ElrondEncodeTransaction.delegate();

        break;
      case "claimRewards":
        gasLimit = GAS.CLAIM;
        t.data = ElrondEncodeTransaction.claimRewards();

        transactionValue = new BigNumber(0); //amount of EGLD to be sent should be 0 in a claimRewards transaction
        break;
      case "withdraw":
        gasLimit = GAS.DELEGATE;
        t.data = ElrondEncodeTransaction.withdraw();

        transactionValue = new BigNumber(0); //amount of EGLD to be sent should be 0 in a withdraw transaction
        break;
      case "reDelegateRewards":
        gasLimit = GAS.DELEGATE;
        t.data = ElrondEncodeTransaction.reDelegateRewards();

        transactionValue = new BigNumber(0); //amount of EGLD to be sent should be 0 in a reDelegateRewards transaction
        break;
      case "unDelegate":
        if (transactionValue.lt(MIN_DELEGATION_AMOUNT)) {
          throw new Error(
            `Undelegated amount should be minimum ${MIN_DELEGATION_AMOUNT_DENOMINATED} EGLD`
          );
        }

        gasLimit = GAS.DELEGATE;
        t.data = ElrondEncodeTransaction.unDelegate(t);

        transactionValue = new BigNumber(0); //amount of EGLD to be sent should be 0 in a unDelegate transaction
        break;
      case "send":
        break;
      default:
        throw new Error("Unsupported transaction.mode = " + t.mode);
    }
  }

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
