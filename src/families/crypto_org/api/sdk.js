// @flow
import { CroSDK, CroNetwork } from "@crypto-com/chain-jslib";
import {
  CryptoOrgAccountTransaction,
  CryptoOrgMsgSendContent,
  CryptoOrgAmount,
  CryptoOrgAccountTransactionTypeEnum,
  CryptoOrgCurrency,
} from "./sdk.types";
import { BigNumber } from "bignumber.js";
import { Axios } from "axios";

import type { Operation, OperationType } from "../../../types";
import { getEnv } from "../../../env";
import { encodeOperationId } from "../../../operation";

type AsyncApiFunction = (any) => Promise<any>;

const CRYPTO_ORG_INDEXER = () => getEnv("CRYPTO_ORG_INDEXER");
const CRYPTO_ORG_RPC_URL = () => getEnv("CRYPTO_ORG_RPC_URL");

let api = null;

/**
 * Connects to MyCoin Api
 */
async function withApi(execute: AsyncApiFunction): Promise<any> {
  if (!api) {
    const sdk = CroSDK({ network: CroNetwork.Mainnet });
    api = sdk.CroClient.connect(CRYPTO_ORG_RPC_URL);
  }

  try {
    const res = await execute(api);
    return res;
  } catch {
    // Handle Error or Retry
  }
}
/**
 * Get account balances and nonce
 */
export const getAccount = async (addr: string) =>
  withApi(async (api) => {
    const { amount } = await api.getCroBalance(addr);
    const { sequence } = await api.getAccount(addr);
    const { header } = await api.getBlock();
    const height = header.height;

    return {
      height,
      balance: BigNumber(amount),
      sequence,
    };
  });

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
  let rawTransactions: Operation[] = {};
  Axios.get(
    CRYPTO_ORG_INDEXER +
      "/api/v1/accounts/" +
      addr +
      "/transactions?pagination=offset&page=" +
      startAt
  )
    .then(function (response) {
      const accountTransactions: CryptoOrgAccountTransaction[] =
        response.data.result;
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
    })
    // eslint-disable-next-line no-unused-vars
    .catch(function (error) {
      // handle error
    });

  return rawTransactions;
};

/**
 * Broadcast blob to blockchain
 */
export const submit = async (blob: string) =>
  withApi(async (api) => {
    const { transactionHash } = await api.broadcastTx(blob);
    return { transactionHash };
  });
