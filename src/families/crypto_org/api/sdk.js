// @flow
import { utils } from "@crypto-com/chain-jslib";
import {
  CryptoOrgAccountTransaction,
  CryptoOrgMsgSendContent,
  CryptoOrgAmount,
  CryptoOrgAccountTransactionTypeEnum,
  CryptoOrgCurrency,
  CryptoOrgTestnetCurrency,
} from "./sdk.types";
import { BigNumber } from "bignumber.js";
import network from "../../../network";
import { getCroSdk, isTestNet } from "../logic";

import type { Operation, OperationType } from "../../../types";
import { getEnv } from "../../../env";
import { encodeOperationId } from "../../../operation";

const PAGINATION_LIMIT = 200;

const instances = {};
/**
 * Get CroClient
 */
export async function getClient(currency) {
  if (instances[currency]) {
    return instances[currency];
  }
  const crypto_org_rpc_url = isTestNet(currency)
    ? getEnv("CRYPTO_ORG_TESTNET_RPC_URL")
    : getEnv("CRYPTO_ORG_RPC_URL");
  instances[currency] = await getCroSdk(currency).CroClient.connect(
    crypto_org_rpc_url
  );
  await instances[currency].connect();
  return instances[currency];
}

/**
 * Extract only the cro amount from list of currencies
 */
export const getCroAmount = (amounts: CryptoOrgAmount[], currency: string) => {
  const cryptoOrgCurrency = isTestNet(currency)
    ? CryptoOrgTestnetCurrency
    : CryptoOrgCurrency;
  return amounts.reduce(
    (result, current) =>
      current.denom === cryptoOrgCurrency
        ? result.plus(BigNumber(current.amount))
        : result,
    BigNumber(0)
  );
};

/**
 * Get account balances
 */
export const getAccount = async (addr: string, currency: string) => {
  const client = await getClient(currency);
  const { header } = await client.getBlock();

  const crypto_org_indexer = isTestNet(currency)
    ? getEnv("CRYPTO_ORG_TESTNET_INDEXER")
    : getEnv("CRYPTO_ORG_INDEXER");

  let balance = 0;
  let bondedBalance = 0;
  let redelegatingBalance = 0;
  let unbondingBalance = 0;
  let commissions = 0;
  let data;
  try {
    const response = await network({
      method: "GET",
      url: `${crypto_org_indexer}/api/v1/accounts/${addr}`,
    });
    data = response.data;
  } catch (error) {
    if (error?.status !== 404) {
      throw error;
    }
  }

  if (data) {
    balance = getCroAmount(data.result.balance, currency);
    bondedBalance = getCroAmount(data.result.bondedBalance, currency);
    redelegatingBalance = getCroAmount(
      data.result.redelegatingBalance,
      currency
    );
    unbondingBalance = getCroAmount(data.result.unbondingBalance, currency);
    commissions = getCroAmount(data.result.commissions, currency);
  }
  return {
    blockHeight: header.height,
    balance: BigNumber(balance),
    bondedBalance: BigNumber(bondedBalance),
    redelegatingBalance: BigNumber(redelegatingBalance),
    unbondingBalance: BigNumber(unbondingBalance),
    commissions: BigNumber(commissions),
  };
};

/**
 * Get account information for sending transactions
 */
export const getAccountParams = async (addr: string, currency: string) => {
  const client = await getClient(currency);
  const { accountNumber, sequence } = await client.getAccount(addr);

  return {
    accountNumber: accountNumber ?? 0,
    sequence: sequence ?? 0,
  };
};

/**
 * Returns true if account is the signer
 */
function isSender(transaction: CryptoOrgMsgSendContent, addr: string): boolean {
  return transaction.fromAddress === addr;
}

/**
 * Map transaction to an Operation Type
 */
function getOperationType(
  messageSendContent: CryptoOrgMsgSendContent,
  addr: string
): OperationType {
  return isSender(messageSendContent, addr) ? "OUT" : "IN";
}

/**
 * Map transaction to a correct Operation Value (affecting account balance)
 */
function getOperationValue(
  messageSendContent: CryptoOrgMsgSendContent,
  currency: string
): BigNumber {
  return getCroAmount(messageSendContent.amount, currency);
}

/**
 * Map the send history transaction to a Ledger Live Operation
 */
function convertSendTransactionToOperation(
  accountId: string,
  addr: string,
  messageSendContent: CryptoOrgMsgSendContent,
  transaction: CryptoOrgAccountTransaction,
  currency: string
): Operation {
  const type = getOperationType(messageSendContent, addr);

  return {
    id: encodeOperationId(accountId, messageSendContent.txHash, type),
    accountId,
    fee: BigNumber(transaction.fee.amount),
    value: getOperationValue(messageSendContent, currency),
    type,
    hash: messageSendContent.txHash,
    blockHash: transaction.blockHash,
    blockHeight: transaction.blockHeight,
    date: new Date(transaction.blockTime),
    senders: [messageSendContent.fromAddress],
    recipients: [messageSendContent.toAddress],
    hasFailed: !transaction.success,
    extra: undefined,
  };
}

/**
 * Fetch operation list
 */
export const getOperations = async (
  accountId: string,
  addr: string,
  startAt: number,
  currency: string
): Promise<Operation[]> => {
  let rawTransactions: Operation[] = [];

  const crypto_org_indexer = isTestNet(currency)
    ? getEnv("CRYPTO_ORG_TESTNET_INDEXER")
    : getEnv("CRYPTO_ORG_INDEXER");

  const { data } = await network({
    method: "GET",
    url: `${crypto_org_indexer}/api/v1/accounts/${addr}/transactions?pagination=offset&page=${
      startAt + 1
    }&limit=${PAGINATION_LIMIT}`,
  });
  const accountTransactions: CryptoOrgAccountTransaction[] = data.result;
  for (let i = 0; i < accountTransactions.length; i++) {
    const msgs = accountTransactions[i].messages;
    for (let j = 0; j < msgs.length; j++) {
      switch (msgs[j].type) {
        case CryptoOrgAccountTransactionTypeEnum.MsgSend: {
          const msgSend: CryptoOrgMsgSendContent = msgs[j].content;
          rawTransactions.push(
            convertSendTransactionToOperation(
              accountId,
              addr,
              msgSend,
              accountTransactions[i],
              currency
            )
          );
          break;
        }
        default:
      }
    }
  }

  return rawTransactions;
};

/**
 * Broadcast blob to blockchain
 */
export const broadcastTransaction = async (blob: string, currency: string) => {
  const client = await getClient(currency);
  const broadcastResponse = await client.broadcastTx(
    utils.Bytes.fromHexString(blob).toUint8Array()
  );
  return broadcastResponse;
};
