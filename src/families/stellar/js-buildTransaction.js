// @flow
import invariant from "invariant";
import { BigNumber } from "bignumber.js";
import { AmountRequired, FeeNotLoaded } from "@ledgerhq/errors";
import type { Account } from "../../types";
import type { Transaction } from "./types";
import { getSequence } from "./api";
import { addressExists } from "./logic";

// TODO: Replace libcore transactionBuilder by SDK

/**
 * @param {Account} a
 * @param {Transaction} t
 */
export const buildTransaction = async (
  account: Account,
  transaction: Transaction
) => {
  const {
    recipient,
    useAllAmount,
    networkInfo,
    fees,
    memoType,
    memoValue,
  } = transaction;
  if (!fees) {
    throw new FeeNotLoaded();
  }

  invariant(networkInfo && networkInfo.family === "stellar", "stellar family");

  let amount = BigNumber(0);
  amount = useAllAmount
    ? account.balance.minus(networkInfo.baseReserve).minus(fees)
    : transaction.amount;

  if (!amount) throw new AmountRequired();

  const recipientExists = await addressExists(transaction.recipient); // FIXME: use cache with checkRecipientExist instead?
  if (recipientExists) {
    await transactionBuilder.addNativePayment(recipient, amount);
  } else {
    await transactionBuilder.addCreateAccount(recipient, amount);
  }

  const sequence = await getSequence(account);
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

  console.log("XXXXX - buildTransaction returns:");
  console.log(built);

  return built;
};

export default buildTransaction;
