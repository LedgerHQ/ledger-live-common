// @flow
import { BigNumber } from "bignumber.js";
import type {
  Transaction,
  SendTransactionData,
  SendTransactionDataSuccess,
  FreezeTransactionData,
  UnfreezeTransactionData,
  NetworkInfo
} from "../families/tron/types";
import type { Account, SubAccount, Operation } from "../types";
import bs58check from "bs58check";
import { log } from "@ledgerhq/logs";
import network from "../network";
import get from "lodash/get";

const baseApiUrl = "https://api.trongrid.io";

const decode58Check = base58 =>
  Buffer.from(bs58check.decode(base58)).toString("hex");

async function post(url, body) {
  const { data } = await network({
    method: "POST",
    url,
    data: body
  });
  log("http", url);
  return data;
}

async function fetch(url) {
  const { data } = await network({
    method: "GET",
    url
  });
  log("http", url);
  return data;
}

export const freezeTronTransaction = async (a: Account, t: Transaction) => {
  const txData: FreezeTransactionData = {
    frozen_balance: t.amount.toNumber(),
    frozen_duration: t.duration || 3,
    resource: t.resource,
    owner_address: decode58Check(a.freshAddress),
    receiver_address: decode58Check(t.recipient),
  };

  const url = `${baseApiUrl}/wallet/freezebalance`;

  const result = await post(url, txData);

  return result;
};

export const unfreezeTronTransaction = async (a: Account, t: Transaction) => {
  const txData: UnfreezeTransactionData = {
    resource: t.resource,
    owner_address: decode58Check(a.freshAddress),
    receiver_address: decode58Check(t.recipient),
  };

  const url = `${baseApiUrl}/wallet/unfreezebalance`;
  const result = await post(url, txData);
  //TODO: Error on unfreeze if the day is not available

  return result;
};

// Send trx or trc10/trc20 tokens
export const createTronTransaction = async (
  a: Account,
  t: Transaction,
  subAccount: ?SubAccount
): Promise<SendTransactionDataSuccess> => {
  const tokenId = subAccount && subAccount.type === 'TokenAccount' 
    ? subAccount.token.id.split("/")[2] // Need to get this token id properly
    : null;

  const txData: SendTransactionData = {
    to_address: decode58Check(t.recipient),
    owner_address: decode58Check(a.freshAddress),
    amount: t.amount.toNumber(),
    asset_name: tokenId && Buffer.from(tokenId).toString("hex")
  };

  const url = subAccount
    ? `${baseApiUrl}/wallet/transferasset`
    : `${baseApiUrl}/wallet/createtransaction`;

  const preparedTransaction = await post(url, txData);

  return preparedTransaction;
};

export const broadcastTron = async (
  trxTransaction: SendTransactionDataSuccess
) => {
  const result = await post(
    `${baseApiUrl}/wallet/broadcasttransaction`,
    trxTransaction
  );
  return result;
};

export async function fetchTronAccount(addr: string) {
  const data = await fetch(`${baseApiUrl}/v1/accounts/${addr}`);
  return data.data;
}

// For the moment, fetching transaction info is the only way to get fees from a transaction
async function fetchTronTxInfo(txId: string) {
  return await post(`${baseApiUrl}/wallet/gettransactioninfobyid`, { value: txId });
}

function hasTransferContract(tx: Object): boolean {
  return get(tx, "raw_data.contract", [])
    .some(c => 
      c.type === "TransferContract" || c.type === "TransferAssetContract"
    )
}

export async function fetchTronAccountTxs(
  addr: string,
  shouldFetchMoreTxs: (Operation[]) => boolean
) {
  const getTxs = async (url: string) => fetch(url).then(resp => {
    const nextUrl = get(resp, "meta.links.next");

    const resultsWithTxInfo = 
      Promise.all((resp.data || [])
        .map(tx => {
          const fetchedTxInfo = hasTransferContract(tx) // only if it's a transfer, we need to fetch tx info to get fees
            ? fetchTronTxInfo(tx.txID) 
            : Promise.resolve(null)
          return fetchedTxInfo.then(txInfo => ({ ...tx, txInfo }))
        }))
        .then(results => ({ results, nextUrl }))

    return resultsWithTxInfo;
  });

  const getEntireTxs = async (url: string) => {
    const response = await getTxs(url);

    if (shouldFetchMoreTxs(response.results) && response.nextUrl) {
      const nextResponse = await getEntireTxs(response.nextUrl);
      return {
        results: response.results.concat(nextResponse.results),
        nextUrl: nextResponse.nextUrl
      }
    } else {
      return response;
    }
  };

  const entireTxs = await getEntireTxs(`${baseApiUrl}/v1/accounts/${addr}/transactions?limit=200`)

  return entireTxs.results
}

export const getTronAccountNetwork = async (address: string): Promise<NetworkInfo> => {
  try {
    const result = await post(`${baseApiUrl}/wallet/getaccountnet`, {
      address: decode58Check(address)
    });
    return result;
  } catch (e) {
    throw new Error("unexpected error occured when calling getTronAccountNetwork");
  }
};

// TODO: Find an another way to validate formula, I don't like to depend on api for this
export const validateAddress = async (address: string) => {
  try {
    const result = await post(
      `${baseApiUrl}/wallet/validateaddress`,
      { address: decode58Check(address) }
    );

    return result.result || false;
  } catch (e) {
    // dont throw anything
  }
  return false;
};
