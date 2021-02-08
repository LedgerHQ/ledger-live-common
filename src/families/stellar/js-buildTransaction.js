// @flow
import invariant from "invariant";
import { BigNumber } from "bignumber.js";
import { FeeNotLoaded } from "@ledgerhq/errors";
import type { Account } from "../../types";
import type { Transaction } from "./types";
import type { addressExists, getSequence } from "../api";

// TODO: Implement XDR encode(/decode)
// TODO: Replace libcore tx builder mechanism

/**
 * @param {Account} a
 * @param {Transaction} t
 */
export const buildTransaction = async (
  a: Account,
  t: Transaction,
) => /* TODO: return type? */  {
  const { recipient, useAllAmount, networkInfo, fees, memoType, memoValue } = transaction;
  if (!fees) {
    throw new FeeNotLoaded();
  }

  invariant(networkInfo && networkInfo.family === "stellar", "stellar family");

  let amount = BigNumber(0);
  amount = useAllAmount
    ? account.balance.minus(networkInfo.baseReserve).minus(fees)
    : transaction.amount;

  // FIXME: more specific type of error?
  if (!amount) throw new Error("amount is missing");

  const recipientExists = await addressExists(t.recipient); // FIXME: use cache with checkRecipientExist instead?
  if (recipientExists) {
    await transactionBuilder.addNativePayment(recipient, amount);
  } else {
    await transactionBuilder.addCreateAccount(recipient, amount);
  }

  const sequence = await getSequence();
  await transactionBuilder.setSequence(sequence);

  if (memoType && memoValue) {
    switch (memoType) {
      case "MEMO_TEXT":
        await transactionBuilder.setTextMemo(memoValue);
        break;
  
      case "MEMO_ID":
        await transactionBuilder.setNumberMemo(BigNumber(memoValue));
        break;
  
      case "MEMO_HASH":
        await transactionBuilder.setHashMemo(memoValue);
        break;
  
      case "MEMO_RETURN":
        await transactionBuilder.setReturnMemo(memoValue);
        break;
  
      default:
        break;
    }
  }

  const built = await transactionBuilder.build();

  return built;
}

export default stellarBuildTransaction;
