//@flow
import { BigNumber } from "bignumber.js";
import StellarSdk from "stellar-sdk";
import { getEnv } from "../../../env";
import { getCryptoCurrencyById, parseCurrencyUnit } from "../../../currencies";
import type { Account, NetworkInfo, Operation } from "../../../types";
import type { RawAccount, RawTransaction } from "./horizon.types";
import { getAccountSpendableBalance, formatOperation } from "../logic";

const LIMIT = 200;
const FALLBACK_BASE_FEE = 100;

const currency = getCryptoCurrencyById("stellar");

const baseAPIUrl = getEnv("API_STELLAR_HORIZON");
const server = new StellarSdk.Server(baseAPIUrl);

export const fetchBaseFee = async (): Promise<number> => {
  let baseFee;

  try {
    baseFee = await server.fetchBaseFee();
  } catch (e) {
    baseFee = FALLBACK_BASE_FEE;
  }

  return baseFee;
};

/**
 * Get all account-related data
 *
 * @async
 * @param {*} addr
 */
export const fetchAccount = async (addr: string) => {
  let account: RawAccount = {};
  let balance = {};
  try {
    account = await server.accounts().accountId(addr).call();
    balance = account.balances.find((balance) => {
      return balance.asset_type === "native";
    });
  } catch (e) {
    if (e.name === "NotFoundError") {
      balance.balance = "0";
    } else {
      throw e;
    }
  }

  const formattedBalance = parseCurrencyUnit(
    currency.units[0],
    balance.balance
  );
  const spendableBalance = await getAccountSpendableBalance(
    formattedBalance,
    account
  );

  return {
    blockHeight: account.sequence ? Number(account.sequence) : undefined,
    balance: formattedBalance,
    spendableBalance,
  };
};

/**
 * Fetch all operations for a single account from indexer
 *
 * @param {string} accountId
 * @param {string} addr
 * @param {number} startAt - blockHeight after which you fetch this op (included)
 *
 * @return {Operation[]}
 */
export const fetchOperations = async (
  accountId: string,
  addr: string,
  startAt: number = 0
): Promise<Operation[]> => {
  const transactions = await fetchTransactionsList(accountId, addr, startAt);
  return await fetchOperationList(accountId, addr, transactions);
};

const fetchTransactionsList = async (
  accountId: string,
  addr: string,
  startAt: number
): Promise<RawTransaction[]> => {
  let transactions = {};
  let mergedTransactions = [];

  try {
    transactions = await server
      .transactions()
      .forAccount(addr)
      .cursor(startAt)
      .limit(LIMIT)
      .call();

    mergedTransactions = transactions.records;

    while (transactions.records.length > 0) {
      transactions = await transactions.next();
      mergedTransactions = mergedTransactions.concat(transactions.records);
    }
  } catch (e) {
    if (e.name !== "NotFoundError") {
      throw e;
    }

    return [];
  }

  return mergedTransactions;
};

const fetchOperationList = async (
  accountId: string,
  addr: string,
  transactions: RawTransaction[]
): Promise<Operation[]> => {
  let formattedMergedOp = [];

  for (let i = 0; i < transactions.length; i++) {
    let operations = await server
      .operations()
      .forTransaction(transactions[i].id)
      .call();

    formattedMergedOp = formattedMergedOp.concat(
      operations.records.map((operation) => {
        return formatOperation(operation, transactions[i], accountId, addr);
      })
    );

    while (operations.records.length > 0) {
      operations = await operations.next();

      formattedMergedOp = formattedMergedOp.concat(
        operations.records.map((operation) => {
          return formatOperation(operation, transactions[i], accountId, addr);
        })
      );
    }
  }

  return formattedMergedOp;
};

export const fetchAccountNetworkInfo = async (
  account: Account
): Promise<NetworkInfo> => {
  const extendedAccount = await server
    .accounts()
    .accountId(account.freshAddress)
    .call();

  const ledger = await server
    .ledgers()
    .ledger(extendedAccount.last_modified_ledger)
    .call();

  const baseReserve = BigNumber(ledger.base_reserve_in_stroops.toString());

  const fees = BigNumber(ledger.base_fee_in_stroops.toString());

  return {
    family: "stellar",
    fees,
    baseReserve,
  };
};

export const fetchSequence = async (a: Account) => {
  const extendedAccount = await server.loadAccount(a.freshAddress);
  return BigNumber(extendedAccount.sequence);
};

export const fetchSigners = async (a: Account) => {
  const extendedAccount = await server
    .accounts()
    .accountId(a.freshAddress)
    .call();
  return extendedAccount.signers;
};

export const broadcastTransaction = async (
  signedTransaction
): Promise<string> => {
  const res = await server.submitTransaction(signedTransaction, {
    skipMemoRequiredCheck: true,
  });
  return res.hash;
};

export const buildPaymentOperation = (
  destination: string,
  amount: BigNumber
) => {
  const formattedAmount = amount
    .dividedBy(BigNumber(10).pow(currency.units[0].magnitude))
    .toString();

  return StellarSdk.Operation.payment({
    destination: destination,
    amount: formattedAmount,
    asset: StellarSdk.Asset.native(),
  });
};

export const buildCreateAccountOperation = (
  destination: string,
  amount: BigNumber
) => {
  const formattedAmount = amount
    .dividedBy(BigNumber(10).pow(currency.units[0].magnitude))
    .toString();

  return StellarSdk.Operation.createAccount({
    destination: destination,
    startingBalance: formattedAmount,
  });
};

export const buildTransactionBuilder = (source: string, fee: BigNumber) => {
  const formattedFee = fee.toString();

  return new StellarSdk.TransactionBuilder(source, {
    fee: formattedFee,
    networkPassphrase: StellarSdk.Networks.PUBLIC,
  });
};

export const loadAccount = (addr: string) => {
  return server.loadAccount(addr);
};
