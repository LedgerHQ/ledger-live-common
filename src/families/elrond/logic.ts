import type { Account, SubAccount } from "../../types";
import type { Transaction } from "./types";
import * as bech32 from "bech32";
import BigNumber from "bignumber.js";
import { buildTransaction } from "./js-buildTransaction";
import getEstimatedFees from "./js-getFeesForTransaction";

/**
 * The human-readable-part of the bech32 addresses.
 */
const HRP = "erd";

/**
 * The length (in bytes) of a public key (from which a bech32 address can be obtained).
 */
const PUBKEY_LENGTH = 32;

function fromBech32(value: string): string {
  let decoded;

  try {
    decoded = bech32.decode(value);
  } catch (err) {
    throw new Error("Erd address can't be created");
  }

  const prefix = decoded.prefix;
  if (prefix != HRP) {
    throw new Error("Bad HRP");
  }

  const pubkey = Buffer.from(bech32.fromWords(decoded.words));
  if (pubkey.length != PUBKEY_LENGTH) {
    throw new Error("Erd address can't be created");
  }

  return value;
}

/**
 * Returns true if address is a valid bech32
 *
 * @param {string} address
 */
export const isValidAddress = (address: string): boolean => {
  try {
    fromBech32(address);
    return true;
  } catch (error) {
    return false;
  }
};
export const isSelfTransaction = (a: Account, t: Transaction): boolean => {
  return t.recipient === a.freshAddress;
};

/**
 * Returns nonce for an account
 *
 * @param {Account} a
 */
export const getNonce = (a: Account): number => {
  const lastPendingOp = a.pendingOperations[0];
  const nonce = Math.max(
    a.elrondResources?.nonce || 0,
    lastPendingOp && typeof lastPendingOp.transactionSequenceNumber === "number"
      ? lastPendingOp.transactionSequenceNumber + 1
      : 0
  );
  return nonce;
};

export const computeTransactionValue = async (
  t: Transaction,
  a: Account,
  ta: SubAccount | null
): Promise<{
  amount: BigNumber;
  totalSpent: BigNumber;
  estimatedFees: BigNumber;
}> => {
  let amount, totalSpent;

  await buildTransaction(a, ta, t);

  const estimatedFees = await getEstimatedFees(t);

  if (ta) {
    amount = t.useAllAmount ? ta.balance : t.amount;

    totalSpent = amount;
  } else {
    totalSpent = t.useAllAmount
      ? a.balance
      : new BigNumber(t.amount).plus(estimatedFees);

    amount = t.useAllAmount
      ? a.balance.minus(estimatedFees)
      : new BigNumber(t.amount);
  }

  return { amount, totalSpent, estimatedFees };
};
