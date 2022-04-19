import { BigNumber } from "bignumber.js";
import network from "../../../network";
import { getEnv } from "../../../env";
import { Operation, OperationType } from "../../../types";
import { encodeOperationId, patchOperationWithHash } from "../../../operation";
import {
  CosmosAmount,
  OsmosisAccountTransaction,
  OsmosisAccountTransactionTypeEnum,
  OsmosisAmount,
  OsmosisCurrency,
  OsmosisEventContent,
  OsmosisEventNestedContent,
} from "./sdk.types";

const DEFAULT_TRANSACTIONS_LIMIT = 200;
const NAMESPACE = "cosmos";
const VERSION = "v1beta1";

const getIndexerUrl = (route): string =>
  `${getEnv("API_OSMOSIS_INDEXER")}${route || ""}`;
const getNodeUrl = (route): string =>
  `${getEnv("API_OSMOSIS_NODE")}${route || ""}`;

/**
 * Queries the node for account balance
 */
const fetchAccountBalance = async (address: string) => {
  const { data } = await network({
    method: "GET",
    url: getNodeUrl(`/${NAMESPACE}/bank/${VERSION}/balances/${address}`),
  });
  const amount = getMicroOsmoAmountCosmosType(
    data.balances ? data.balances : []
  );
  return amount;
};

/**
 * Queries the node for account information
 */
export const fetchAccountInfo = async (address: string) => {
  const { data } = await network({
    method: "GET",
    url: getNodeUrl(`/${NAMESPACE}/auth/${VERSION}/accounts/${address}`),
  });
  if (data == null) {
    throw new Error("Error fetching account information");
  }
  const accountNumber = data.account?.account_number ?? null;
  const sequence = data.account?.sequence ?? 0;
  return { accountNumber, sequence };
};

/**
 * Returns true if account is the signer
 */
function isSender(content: OsmosisEventNestedContent, addr: string): boolean {
  return content.account.id === addr;
}

/**
 * Map transaction to an Operation Type
 */
function getOperationType(
  eventContent: OsmosisEventContent,
  addr: string
): OperationType {
  return isSender(eventContent.sender[0], addr) ? "OUT" : "IN";
}

/**
 * Map transaction to a correct Operation Value (affecting account balance)
 */
function getOperationValue(
  eventContent: OsmosisEventContent,
  type: string,
  fee: BigNumber
): BigNumber {
  let amount: BigNumber;
  switch (type) {
    // Per operation.ts, in "OUT" case, it includes the fees. in "IN" case, it excludes them.
    case "OUT":
      amount = BigNumber.sum(
        getMicroOsmoAmount(eventContent.sender[0]?.amounts),
        fee
      );
      break;
    case "IN":
      amount = getMicroOsmoAmount(eventContent.recipient[0]?.amounts);
      break;
    default:
      // defaults to received funds (i.e. no fee is added)
      amount = getMicroOsmoAmount(eventContent.recipient[0]?.amounts);
  }
  return amount;
}

/**
 * Extract only the amount from a list of type OsmosisAmount
 */
export const getMicroOsmoAmount = (amounts: OsmosisAmount[]): BigNumber => {
  return amounts.reduce(
    (result, current) =>
      current.currency === OsmosisCurrency
        ? result.plus(new BigNumber(current.numeric))
        : result,
    new BigNumber(0)
  );
};

/**
 * Extract only the amount from a list of type CosmosAmount
 */
export const getMicroOsmoAmountCosmosType = (
  amounts: CosmosAmount[]
): BigNumber => {
  return amounts.reduce(
    (result, current) =>
      current.denom === OsmosisCurrency
        ? result.plus(new BigNumber(current.amount))
        : result,
    new BigNumber(0)
  );
};

/**
 * Map the send history transaction to a Ledger Live Operation
 */
function convertTransactionToOperation(
  accountId: string,
  addr: string,
  eventContent: OsmosisEventContent,
  transaction: OsmosisAccountTransaction,
  memo: string
): Operation {
  const type = getOperationType(eventContent, addr);
  const fee = new BigNumber(getMicroOsmoAmount(transaction.transaction_fee));
  const senders = eventContent.sender[0]?.account?.id
    ? [eventContent.sender[0]?.account?.id]
    : [];
  const recipients = eventContent.recipient[0]?.account?.id
    ? [eventContent.recipient[0]?.account?.id]
    : [];
  return {
    id: encodeOperationId(accountId, transaction.hash, type),
    accountId,
    fee,
    value: getOperationValue(eventContent, type, fee),
    type,
    hash: transaction.hash,
    blockHash: transaction.block_hash,
    blockHeight: transaction.height,
    date: new Date(transaction.time),
    senders,
    recipients,
    hasFailed: transaction.has_errors,
    extra: { memo },
  };
}

/**
 * Fetch operation list from indexer
 */
export const getOperations = async (
  accountId: string,
  addr: string,
  startAt = 0,
  transactionsLimit: number = DEFAULT_TRANSACTIONS_LIMIT
): Promise<Operation[]> => {
  const operations: Operation[] = [];
  const { data } = await network({
    method: "POST",
    url: getIndexerUrl(`/transactions_search/`),
    data: {
      network: "osmosis",
      account: [addr],
      limit: transactionsLimit,
      offset: startAt,
    },
  });
  if (data == null) {
    // throw new Error("Error retrieving transaction data");
    return operations;
  }
  const accountTransactions = data;
  for (let i = 0; i < accountTransactions.length; i++) {
    const events = accountTransactions[i].events;
    const memo = accountTransactions[i].memo;
    const memoTransaction = memo || "";
    for (let j = 0; j < events.length; j++) {
      const transactionType = events[j].kind ? events[j].kind : "n/a";
      switch (
        // Example: "send". See: OsmosisAccountTransactionTypeEnum.
        // Note: "send" means all transactions where some party was sending some OSMO,
        // which means it shouldn't be interpreted as OUT transactions. See isSender()
        // for context on how we determine if a "send" transaction is IN or OUT.
        transactionType
      ) {
        case OsmosisAccountTransactionTypeEnum.Send: {
          const eventContent: OsmosisEventContent = events[j].sub;
          operations.push(
            convertTransactionToOperation(
              accountId,
              addr,
              eventContent[0],
              accountTransactions[i],
              memoTransaction
            )
          );
          break;
        }
        default:
          // TODO Get feedback on what we want to do here. Maybe just silently ignore
          // or consider adding the operation with type "NONE", described in operation.ts
          // throw new Error("encountered error while parsing transaction type");
          // console.log(
          //   "skipping transaction, because transaction type is: ",
          //   transactionType
          // );
          break;
      }
    }
  }

  return operations;
};

/**
 * Query the node for updated block height and chain id
 */
const fetchLatestBlockInfo = async () => {
  const { data } = await network({
    method: "GET",
    url: getNodeUrl(`/blocks/latest`),
  });
  if (data == null) {
    throw new Error("Error fetching block information");
  }
  // TODO what kind of data validation do we want to have here? any sensible defaults?
  const blockHeight = data?.block?.header?.height;
  const chainId = data?.block?.header?.chain_id;
  return { blockHeight, chainId };
};

/**
 * Wrapper to retrieve chain id
 */
export const getChainId = async () => {
  const { chainId } = await fetchLatestBlockInfo();
  return chainId;
};

/**
 * Wrapper for account balance and node info
 */
export const getAccount = async (address: string) => {
  const balance = await fetchAccountBalance(address);
  const { blockHeight } = await fetchLatestBlockInfo();
  return {
    blockHeight,
    balance,
    spendableBalance: balance,
  };
};

/**
 * Broadcasts a signed operation to the node
 */
export const broadcast = async ({
  signedOperation: { operation, signature },
}): Promise<Operation> => {
  const url = getNodeUrl(`/${NAMESPACE}/tx/${VERSION}/txs`);
  const { data } = await network({
    method: "POST",
    url: url,
    data: {
      tx_bytes: Array.from(Uint8Array.from(Buffer.from(signature, "hex"))),
      mode: "BROADCAST_MODE_SYNC",
    },
  });

  if (data.tx_response.code != 0) {
    // error codes: https://github.com/cosmos/cosmos-sdk/blob/master/types/errors/errors.go
    throw new Error(
      "invalid broadcast return (code: " +
        (data.tx_response.code || "?") +
        ", message: '" +
        (data.tx_response.raw_log || "") +
        "')"
    );
  }

  return patchOperationWithHash(operation, data.tx_response.txhash);
};
