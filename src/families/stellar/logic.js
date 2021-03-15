// @flow
import { BigNumber } from "bignumber.js";
import StellarSdk from "stellar-sdk";
import type { CacheRes } from "../../cache";
import { makeLRUCache } from "../../cache";
import type { Account, Operation, OperationType } from "../../types";

import { fetchSigners, fetchBaseFee, loadAccount } from "./api";
import type {
  RawAccount,
  RawOperation,
  RawTransaction,
} from "./api/horizon.types";
import { getCryptoCurrencyById, parseCurrencyUnit } from "../../currencies";
import { encodeOperationId } from "../../operation";

const currency = getCryptoCurrencyById("stellar");

const getMinimumBalance = (account: RawAccount): BigNumber => {
  const baseReserve = 0.5;
  const numberOfEntries = account.subentry_count;

  const minimumBalance = (2 + numberOfEntries) * baseReserve;

  return parseCurrencyUnit(currency.units[0], minimumBalance.toString());
};

export const getAccountSpendableBalance = async (
  balance: BigNumber,
  account: RawAccount
): Promise<BigNumber> => {
  const minimumBalance = getMinimumBalance(account);
  const baseFee = await fetchBaseFee();
  return BigNumber.max(balance.minus(minimumBalance).minus(baseFee), 0);
};

export const getOperationType = (
  operation: RawOperation,
  addr: string
): OperationType => {
  switch (operation.type) {
    case "create_account":
      return operation.funder === addr ? "OUT" : "IN";
    case "payment":
      if (operation.from === addr && operation.to !== addr) {
        return "OUT";
      }
      return "IN";
    case "path_payment_strict_send":
      return "OUT";

    case "path_payment_strict_receive":
      return "IN";

    default:
      if (operation.source_account === addr) {
        return "OUT";
      }
      return "IN";
  }
};

const getRecipients = (operation): string[] => {
  switch (operation.type) {
    case "create_account":
      return [operation.account];
    case "payment":
      return [operation.to];

    default:
      return [];
  }
};

export const formatOperation = (
  rawOperation: RawOperation,
  transaction: RawTransaction,
  accountId: string,
  addr: string
): Operation => {
  const type = getOperationType(rawOperation, addr);
  const value = getValue(rawOperation, transaction, type);
  const recipients = getRecipients(rawOperation);

  return {
    id:
      encodeOperationId(accountId, rawOperation.transaction_hash, type) +
      "-" +
      rawOperation.id,
    accountId,
    fee: parseCurrencyUnit(currency.units[0], transaction.fee_charged),
    value,
    type: type,
    hash: rawOperation.transaction_hash,
    blockHeight: transaction.ledger_attr,
    date: new Date(rawOperation.created_at),
    senders: [rawOperation.source_account],
    recipients,
    transactionSequenceNumber: transaction.source_account_sequence,
    hasFailed: !rawOperation.transaction_successful,
    blockHash: "",
    extra: {},
  };
};

const getValue = (
  operation: RawOperation,
  transaction: RawTransaction,
  type: OperationType
): BigNumber => {
  let value = BigNumber(0);

  if (!operation.transaction_successful) {
    return type === "IN" ? value : BigNumber(transaction.fee_charged || 0);
  }

  switch (operation.type) {
    case "create_account":
      value = parseCurrencyUnit(currency.units[0], operation.starting_balance);
      if (type === "OUT") {
        value = value.plus(transaction.fee_charged);
      }
      return value;

    case "payment":
    case "path_payment_strict_send":
    case "path_payment_strict_receive":
      value =
        operation.asset_type === "native"
          ? parseCurrencyUnit(currency.units[0], operation.amount)
          : BigNumber(0);
      if (type === "OUT") {
        value = value.plus(transaction.fee_charged);
      }
      return value;

    default:
      return type !== "IN" ? BigNumber(transaction.fee_charged) : value;
  }
};

// TODO: Move to cache.js
export const checkRecipientExist: CacheRes<
  Array<{ account: Account, recipient: string }>,
  boolean
> = makeLRUCache(
  async ({ recipient }) => await addressExists(recipient),
  (extract) => extract.recipient,
  { max: 300, maxAge: 5 * 60 } // 5 minutes
);

export const isMemoValid = (memoType: string, memoValue: string): boolean => {
  switch (memoType) {
    case "MEMO_TEXT":
      if (memoValue.length > 28) {
        return false;
      }
      break;

    case "MEMO_ID":
      if (BigNumber(memoValue.toString()).isNaN()) {
        return false;
      }
      break;

    case "MEMO_HASH":
    case "MEMO_RETURN":
      if (!memoValue.length || memoValue.length !== 32) {
        return false;
      }
      break;
  }
  return true;
};

export const isAccountMultiSign = async (account: Account) => {
  const signers = await fetchSigners(account);

  return signers.length > 1;
};

/**
 * Returns true if address is valid, false if it's invalid (can't parse or wrong checksum)
 *
 * @param {*} address
 */
export const isAddressValid = (address: string): boolean => {
  if (!address) return false;
  try {
    return StellarSdk.StrKey.isValidEd25519PublicKey(address);
  } catch (err) {
    return false;
  }
};

/**
 * Checks if the current account exists on the stellar Network. If it doesn't the account needs
 * to be activated by sending an account creation operation with an amount of at least the base reserve.
 *
 * @param {*} address
 */
export const addressExists = async (address: string): Promise<boolean> => {
  try {
    await loadAccount(address);
  } catch (error) {
    if (error.name === "NotFoundError") {
      return false;
    }
    throw error;
  }

  return true;
};
