// @flow
import { BigNumber } from "bignumber.js";
import type {
  Transaction,
  SendTransactionData,
  SendTransactionDataSuccess,
  FreezeTransactionData,
  UnfreezeTransactionData,
  NetworkInfo,
  BandwidthInfo,
  SuperRepresentative,
  SuperRepresentativeData,
  TronResources,
  Vote
} from "../families/tron/types";
import type { Account, SubAccount, Operation } from "../types";
import { decode58Check, encode58Check, hexToAscii } from "../families/tron/utils";
import { log } from "@ledgerhq/logs";
import network from "../network";
import { makeLRUCache } from "../cache";
import get from "lodash/get";
import sumBy from "lodash/sumBy";
import take from "lodash/take";

async function post(url: string, body: Object) {
  const { data } = await network({
    method: "POST",
    url,
    data: body
  });

  log("http", url);

  if (data.Error) throw new Error(data.Error);
  
  return data;
}

async function fetch(url: string) {
  const { data } = await network({
    method: "GET",
    url
  });
  log("http", url);
  return data;
}

const baseApiUrl = "https://api.trongrid.io";

export const freezeTronTransaction = async (
  a: Account, 
  t: Transaction
): Promise<SendTransactionDataSuccess> => {
  const txData: FreezeTransactionData = {
    frozen_balance: t.amount.toNumber(),
    frozen_duration: t.duration || 3,
    resource: t.resource,
    owner_address: decode58Check(a.freshAddress),
    receiver_address: t.recipient ? decode58Check(t.recipient) : undefined,
  };

  const url = `${baseApiUrl}/wallet/freezebalance`;

  const result = await post(url, txData);

  return result;
};

export const unfreezeTronTransaction = async (
  a: Account,
  t: Transaction
): Promise<SendTransactionDataSuccess> => {
  const txData: UnfreezeTransactionData = {
    resource: t.resource,
    owner_address: decode58Check(a.freshAddress),
    receiver_address: t.recipient ? decode58Check(t.recipient) : undefined,
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
    const result = await post(`${baseApiUrl}/wallet/getaccountresource`, {
      address: decode58Check(address)
    });
    return result;
  } catch (e) {
    throw new Error("unexpected error occured when calling getTronAccountNetwork");
  }
};

// TODO: Find an another way to validate formula, I don't like to depend on api for this
export const validateAddress = async (address: string): Promise<boolean> => {
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

// cache for account names (name is unchanged over time)
const accountNamesCache = makeLRUCache(
  async (addr: string): Promise<?string> => getAccountName(addr),
  (addr: string) => addr,
  {
    max: 300,
    maxAge: 180 * 60 * 1000 // 3hours
  }
);

// cache for super representative brokerages (brokerage is unchanged over time)
const srBrokeragesCache = makeLRUCache(
  async (addr: string): Promise<number> => getBrokerage(addr),
  (addr: string) => addr,
  {
    max: 300,
    maxAge: 180 * 60 * 1000 // 3hours
  }
);

export const getAccountName = async (addr: string): Promise<?string> => {
  const tronAcc = await fetchTronAccount(addr);
  const acc = tronAcc[0];
  const accountName: ?string = acc.account_name 
    ? hexToAscii(acc.account_name) 
    : undefined;

  accountNamesCache.hydrate(addr, accountName); // put it in cache

  return accountName;
};

export const getBrokerage = async (addr: string): Promise<number> => {
  const { brokerage } = await post(`${baseApiUrl}/wallet/getBrokerage`, { address: addr });

  srBrokeragesCache.hydrate(addr, brokerage); // put it in cache

  return brokerage;
};

export const getTronSuperRepresentatives = async (): Promise<SuperRepresentative[]> => {
  try {
    const result = await post(`${baseApiUrl}/wallet/listwitnesses`, {});
    
    const superRepresentatives = 
      await Promise.all(
        result.witnesses.map(w => {
          const encodedAddress = encode58Check(w.address);

          return accountNamesCache(encodedAddress).then(accountName =>
            srBrokeragesCache(encodedAddress).then(brokerage => (
              {
                ...w,
                address: encodedAddress,
                name: accountName,
                brokerage,
                voteCount: w.voteCount || 0,
                isJobs: w.isJobs || false
              }
            ))
          );
        })
      );

    const sortedSrs = superRepresentatives.sort((a, b) => b.voteCount - a.voteCount);

    return sortedSrs;
  } catch (e) {
    throw new Error("Unexpected error occured when calling getTronSuperRepresentatives");
  }
};

export const getNextVotingDate = async (): Promise<Date> => {
  const { num } = await post(`${baseApiUrl}/wallet/getnextmaintenancetime`);
  return new Date(num);
};

export const getTronSuperRepresentativeData = async (max: ?number): Promise<SuperRepresentativeData> => {
  const list = await getTronSuperRepresentatives();
  const nextVotingDate = await getNextVotingDate();

  return {
    list: max ? take(list, max) : list,
    totalVotes: sumBy(list, "voteCount"),
    nextVotingDate
  };
};

export const voteTronSuperRepresentatives = async (
  a: Account, 
  t: Transaction
): Promise<SendTransactionDataSuccess> => {
  const payload = {
    owner_address: decode58Check(a.freshAddress),
    votes: t.votes.map(v => ({
      vote_address: decode58Check(v.address),
      vote_count: v.voteCount
    }))
  };

  return await post(`${baseApiUrl}/wallet/votewitnessaccount`, payload);
};

export const extractBandwidthInfo = (networkInfo: ?NetworkInfo): BandwidthInfo => {
    // Calculate bandwidth info :
  if (networkInfo) {
    const {
      freeNetUsed = 0,
      freeNetLimit = 0,
      NetUsed = 0,
      NetLimit = 0
    } = networkInfo;
    
    
    const available = freeNetLimit - freeNetUsed + NetLimit - NetUsed;
    const used = freeNetUsed + NetUsed;
    return { available, used };
  }

  return { available: 0, used: 0 };
};

export const getTronResources = async (acc: Object): Promise<TronResources> => {
  try {
    const frozenBandwidth = get(acc, "frozen[0]", undefined);
    const frozenEnergy = get(acc, "account_resource.frozen_balance_for_energy", undefined);

    const encodedAddress = encode58Check(acc.address);

    const tronNetworkInfo = await getTronAccountNetwork(encodedAddress);
    const unwithdrawnReward = await getUnwithdrawnReward(encodedAddress);

    const energy = tronNetworkInfo.EnergyLimit || 0;
    const bandwidth = extractBandwidthInfo(tronNetworkInfo);

    const frozen = {
      bandwidth: frozenBandwidth
        ? { amount: frozenBandwidth.frozen_balance, expiredAt: new Date(frozenBandwidth.expire_time) }
        : undefined,
      energy: frozenEnergy
        ? { amount: frozenEnergy.frozen_balance, expiredAt: new Date(frozenEnergy.expire_time) }
        : undefined
    };

    const tronPower = 
      BigNumber(get(frozen, "bandwidth.amount", 0) + get(frozen, "energy.amount", 0))
        .dividedBy(1000000)
        .decimalPlaces(3, BigNumber.ROUND_HALF_DOWN)
        .toNumber();

    const votes = 
      get(acc, "votes", [])
        .map(v => ({ address: encode58Check(v.vote_address), voteCount: v.vote_count }))

    return {
      energy,
      bandwidth,
      frozen,
      votes,
      tronPower,
      unwithdrawnReward
    };
  } catch (e) {
    throw new Error("Unexpected error occured when calling getTronResources");
  }
};

export const getTronResourcesFromAddress = async (addr: string): Promise<TronResources> => {
  try {
    const acc = await fetchTronAccount(addr);
    return getTronResources(acc);
  } catch (e) {
    throw new Error("Unexpected error occured when calling getTronResourcesFromAddress");
  }
};

export const getUnwithdrawnReward = async (addr: string): Promise<number> => {
  try {
    const { reward = 0 } = await post(`${baseApiUrl}/wallet/getReward`, { address: decode58Check(addr) })
    return reward;
  } catch (e) {
    // TODO: error handling
    return Promise.resolve(0);
  }
};

export const claimRewardTronTransaction = async (account: Account): Promise<SendTransactionDataSuccess> => {
  const url = `${baseApiUrl}/wallet/withdrawbalance`;
  const data = { owner_address: decode58Check(account.freshAddress) };
  const result = await post(url, data);
  // TODO error?
  return result;
}
