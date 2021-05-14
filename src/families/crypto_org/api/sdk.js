// @flow
import { CroSDK, CroNetwork, utils } from "@crypto-com/chain-jslib";
import {
  CryptoOrgAccountTransaction,
  CryptoOrgMsgSendContent,
  CryptoOrgAmount,
  CryptoOrgAccountTransactionTypeEnum,
  CryptoOrgCurrency,
} from "./sdk.types";
import { BigNumber } from "bignumber.js";
import network from "../../../network";

import type { Operation, OperationType } from "../../../types";
import { getEnv } from "../../../env";
import { encodeOperationId } from "../../../operation";

const CRYPTO_ORG_INDEXER = getEnv("CRYPTO_ORG_INDEXER");
const CRYPTO_ORG_RPC_URL = getEnv("CRYPTO_ORG_RPC_URL");
const PAGINATION_LIMIT = 20;

let api = null;

/**
 * Get CroClient
 */
async function getClient() {
  if (!api) {
    const sdk = CroSDK({ network: CroNetwork.Mainnet });
    api = await sdk.CroClient.connect(CRYPTO_ORG_RPC_URL);
  }

  return api;
}

/**
 * Extract only the cro amount from list of currencies
 */
export const getCroAmount = (amounts: CryptoOrgAmount[]) => {
  let result = BigNumber(0);
  amounts.map(function (currentObject) {
    if (currentObject.denom == CryptoOrgCurrency)
      result = result.plus(BigNumber(currentObject.amount));
  });

  return result;
};

/**
 * Get account balances
 */
export const getAccount = async (addr: string) => {
  const client = await getClient();
  const { header } = await client.getBlock();

  let balance = 0;
  let bondedBalance = 0;
  let redelegatingBalance = 0;
  let unbondingBalance = 0;
  let commissions = 0;
  const { data } = await network({
    method: "GET",
    url: `${CRYPTO_ORG_INDEXER}/api/v1/accounts/${addr}`,
  });

  if (data) {
    balance = getCroAmount(data.result.balance);
    bondedBalance = getCroAmount(data.result.bondedBalance);
    redelegatingBalance = getCroAmount(data.result.balance);
    unbondingBalance = getCroAmount(data.result.unbondingBalance);
    commissions = getCroAmount(data.result.commissions);
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
export const getAccountParams = async (addr: string) => {
  const client = await getClient();
  const { pubkey, accountNumber, sequence } = await client.getAccount(addr);

  return {
    accountNumber: accountNumber,
    sequence: sequence,
    publicKey: pubkey.value,
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
  messageSendContent: CryptoOrgMsgSendContent
): BigNumber {
  let result = BigNumber(0);
  const amounts = messageSendContent.amount;
  for (let k = 0; k < amounts.length; k++) {
    const amount: CryptoOrgAmount = amounts[k];
    if (amount.denom == CryptoOrgCurrency) {
      result = result.plus(amount.amount);
    }
  }
  return result;
}

/**
 * Extract extra from transaction if any
 */
function getOperationExtra(
  messageSendContent: CryptoOrgMsgSendContent
): Object {
  return {
    additionalField: messageSendContent.uuid,
  };
}

/**
 * Map the MyCoin history transaction to a Ledger Live Operation
 */
function transactionToOperation(
  accountId: string,
  addr: string,
  messageSendContent: CryptoOrgMsgSendContent,
  transaction: CryptoOrgAccountTransaction
): Operation {
  const type = getOperationType(messageSendContent, addr);

  return {
    id: encodeOperationId(accountId, messageSendContent.txHash, type),
    accountId,
    fee: transaction.fee,
    value: getOperationValue(messageSendContent, addr),
    type,
    hash: messageSendContent.txHash,
    blockHash: transaction.blockHash,
    blockHeight: transaction.blockHeight,
    date: new Date(transaction.blockTime),
    extra: getOperationExtra(transaction),
    senders: [messageSendContent.fromAddress],
    recipients: [messageSendContent.toAddress],
    transactionSequenceNumber: messageSendContent.uuid,
    hasFailed: !transaction.success,
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
  let rawTransactions: Operation[] = [];

  const { data } = await network({
    method: "GET",
    url:
      CRYPTO_ORG_INDEXER +
      `/api/v1/accounts/` +
      addr +
      `/transactions?pagination=offset&page=${
        startAt + 1
      }&limit=${PAGINATION_LIMIT}`,
  });
  const accountTransactions: CryptoOrgAccountTransaction[] = data.result;
  for (let i = 0; i < accountTransactions.length; i++) {
    const msgs = accountTransactions[i].messages;
    for (let j = 0; j < msgs.length; j++) {
      if (msgs[j].type == CryptoOrgAccountTransactionTypeEnum.MsgSend) {
        const msgSend: CryptoOrgMsgSendContent = msgs[j].content;
        rawTransactions.push(
          transactionToOperation(
            accountId,
            addr,
            msgSend,
            accountTransactions[i]
          )
        );
      }
    }
  }

  return rawTransactions;
};

/**
 * Broadcast blob to blockchain
 */
export const submit = async (blob: string) => {
  const client = await getClient();
  const broadcastResponse = await client.broadcastTx(
    utils.Bytes.fromHexString(blob).toUint8Array()
  );
  return broadcastResponse;
};
