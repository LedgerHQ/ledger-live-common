import { BigNumber } from "bignumber.js";
import ElrondApi from "./apiCalls";
import {
  ElrondTransferOptions,
  ESDTToken,
  NetworkInfo,
  Transaction,
} from "../types";
import type { Operation, OperationType } from "../../../types";
import { getEnv } from "../../../env";
import { encodeOperationId } from "../../../operation";
import { getTransactionParams } from "../cache";
import { GAS } from "../constants";
const api = new ElrondApi(getEnv("ELROND_API_ENDPOINT"));

/**
 * Get account balances and nonce
 */
export const getAccount = async (addr: string) => {
  const { balance, nonce } = await api.getAccountDetails(addr);
  const blockHeight = await api.getBlockchainBlockHeight();
  return {
    blockHeight,
    balance: new BigNumber(balance),
    nonce,
  };
};

export const getValidators = async () => {
  const validators = await api.getValidators();
  return {
    validators,
  };
};

export const getNetworkConfig = async (): Promise<NetworkInfo> => {
  return await api.getNetworkConfig();
};

/**
 * Returns true if account is the signer
 */
function isSender(transaction: Transaction, addr: string): boolean {
  return transaction.sender === addr;
}

/**
 * Map transaction to an Operation Type
 */
function getOperationType(
  transaction: Transaction,
  addr: string
): OperationType {
  return isSender(transaction, addr) ? "OUT" : "IN";
}

/**
 * Map transaction to a correct Operation Value (affecting account balance)
 */
function getOperationValue(transaction: Transaction, addr: string): BigNumber {
  if (transaction.transfer === ElrondTransferOptions.esdt) {
    return new BigNumber(transaction.tokenValue ?? 0);
  }

  if (!isSender(transaction, addr)) {
    return new BigNumber(transaction.value ?? 0);
  }

  return new BigNumber(transaction.value ?? 0).plus(transaction.fee ?? 0);
}

/**
 * Map the Elrond history transaction to a Ledger Live Operation
 */
function transactionToOperation(
  accountId: string,
  addr: string,
  transaction: Transaction
): Operation {
  const type = getOperationType(transaction, addr);
  return {
    id: encodeOperationId(accountId, transaction.txHash ?? "", type),
    accountId,
    fee: new BigNumber(transaction.fee || 0),
    value: getOperationValue(transaction, addr),
    type,
    hash: transaction.txHash ?? "",
    blockHash: transaction.miniBlockHash,
    blockHeight: transaction.round,
    date: new Date(transaction.timestamp ? transaction.timestamp * 1000 : 0),
    extra: {},
    senders: [transaction.sender ?? ""],
    recipients: transaction.receiver ? [transaction.receiver] : [],
    transactionSequenceNumber: isSender(transaction, addr)
      ? transaction.nonce
      : undefined,
    hasFailed:
      !transaction.status ||
      transaction.status === "fail" ||
      transaction.status === "invalid",
  };
}

/**
 * Fetch operation list
 */
export const getOperations = async (
  accountId: string,
  addr: string,
  startAt: number
): Promise<Operation[]> => {
  const rawTransactions = await api.getHistory(addr, startAt);
  if (!rawTransactions) return rawTransactions;
  return rawTransactions.map((transaction) =>
    transactionToOperation(accountId, addr, transaction)
  );
};

export const getAccountESDTTokens = async (
  address: string
): Promise<ESDTToken[]> => {
  return await api.getESDTTokensForAddress(address);
};

export const hasESDTTokens = async (address: string): Promise<boolean> => {
  const tokensCount = await api.getESDTTokensCountForAddress(address);
  return tokensCount > 0;
};

export const getAccountESDTOperations = async (
  accountId: string,
  address: string,
  tokenIdentifier: string
): Promise<Operation[]> => {
  const accountESDTTransactions = await api.getESDTTransactionsForAddress(
    address,
    tokenIdentifier
  );

  return accountESDTTransactions.map((transaction) =>
    transactionToOperation(accountId, address, transaction)
  );
};

/**
 * Obtain fees from blockchain
 */
export const getFees = async (t: Transaction): Promise<BigNumber> => {
  const transactionParams = await getTransactionParams();
  const {
    gasPerByte,
    gasPriceModifier,
    gasLimit: minGasLimit,
  } = transactionParams;
  let gasPrice = transactionParams.gasPrice;

  let gasLimit = minGasLimit;
  if (t.subAccountId) {
    gasLimit = GAS.ESDT_TRANSFER;
  }

  const transactionData = Buffer.from(t.data?.trim() || []);

  const moveBalanceGas = minGasLimit + transactionData.length * gasPerByte;

  if (t.subAccountId) {
    gasLimit = GAS.ESDT_TRANSFER;
  }

  gasPrice = new BigNumber(gasPrice);
  const feeForMove = new BigNumber(moveBalanceGas).multipliedBy(gasPrice);
  if (moveBalanceGas === gasLimit) {
    return feeForMove;
  }

  const diff = new BigNumber(gasLimit - moveBalanceGas);
  const modifiedGasPrice = gasPrice.multipliedBy(
    new BigNumber(gasPriceModifier)
  );
  const processingFee = diff.multipliedBy(modifiedGasPrice);

  return feeForMove.plus(processingFee);
};

/**
 * Broadcast blob to blockchain
 */
export const broadcastTransaction = async (
  operation: Operation,
  signature: string
): Promise<string> => {
  return await api.submit(operation, signature);
};
