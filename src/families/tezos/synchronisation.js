// @flow
import invariant from "invariant";
import { BigNumber } from "bignumber.js";
import { log } from "@ledgerhq/logs";
import { mergeOps } from "../../bridge/jsHelpers";
import type { GetAccountShape } from "../../bridge/jsHelpers";
import { encodeOperationId } from "../../operation";
import network from "../../network";
import {
  encodeTokenAccountId,
  decodeTokenAccountId,
  areAllOperationsLoaded,
  inferSubOperations,
  emptyHistoryCache,
} from "../../account";
import type { Operation, Account, NFT } from "../../types";
import api from "./api/tzkt";
import type { APIOperation } from "./api/tzkt";

function bettercalldevToNFT(asset: any): ?NFT {
  if (!asset.token_id) return null;
  let image = asset.display_uri;
  image = image.replace("ipfs://", "https://cloudflare-ipfs.com/ipfs/");
  const nft: $Exact<NFT> = {
    id: "tezos:" + String(asset.token_id),
    name: asset.name,
    description: asset.description,
    image,
    imageThumbnail: image,
    quantity: parseInt(asset.balance, 10),
    permalink: "https://www.hicetnunc.xyz/objkt/" + asset.token_id,
    lastActivityDate: String(asset.token_id || ""), // HACK to have some sort of sort...
    lastSale: null,
    schema: asset.symbol,
    platform: null,
    collection: null,
    creator: {
      address: asset.creator?.[0] || "",
      name: "",
    },
  };
  return nft;
}

async function fetchAllNFTs(address: string) {
  const pageSize = 10;
  let nfts = [];
  let maxIteration = 50; // strong limit for now.
  let offset = 0;
  const seen = {};
  do {
    const { data } = await network({
      url: `https://api.better-call.dev/v1/account/mainnet/${address}/token_balances?sort_by=balance&size=${pageSize}&offset=${offset}`,
    });
    if (typeof data.balances !== "object" || !Array.isArray(data.balances))
      return nfts;
    if (data.balances.length === 0) return nfts;
    offset += pageSize;
    nfts = nfts.concat(
      data.balances
        .map((asset) => {
          try {
            const res = bettercalldevToNFT(asset);
            if (!res || seen[res.id]) return;
            seen[res.id] = true;
            return res;
          } catch (e) {
            console.warn("could not parse nft.", e);
            return null;
          }
        })
        .filter(Boolean)
    );
  } while (--maxIteration);
  return nfts;
}

export const getAccountShape: GetAccountShape = async (infoInput) => {
  let { address, initialAccount } = infoInput;

  const initialStableOperations = initialAccount
    ? initialAccount.operations
    : [];

  // fetch transactions, incrementally if possible
  const mostRecentStableOperation = initialStableOperations[0];

  let lastId =
    initialAccount &&
    areAllOperationsLoaded(initialAccount) &&
    mostRecentStableOperation
      ? mostRecentStableOperation.extra.id || undefined
      : undefined;

  const apiAccountPromise = api.getAccountByAddress(address);
  const blocksCountPromise = api.getBlockCount();

  const [apiAccount, blockHeight] = await Promise.all([
    apiAccountPromise,
    blocksCountPromise,
  ]);

  if (apiAccount.type === "empty") {
    return {
      blockHeight,
      lastSyncDate: new Date(),
    };
  }
  invariant(
    apiAccount.type === "user",
    "unsupported account of type ",
    apiAccount.type
  );

  // TODO paginate with lastId

  const nftsP = fetchAllNFTs(address);
  const apiOperations = await fetchAllTransactions(address, lastId);
  const nfts = await nftsP;

  const { revealed, publicKey, counter } = apiAccount;

  const tezosResources = {
    revealed,
    publicKey,
    counter,
  };

  const balance = BigNumber(apiAccount.balance);
  const subAccounts = [];

  const newOps = apiOperations.map(txToOp(infoInput)).filter(Boolean);

  const operations = mergeOps(initialStableOperations, newOps);

  const accountShape: $Shape<Account> = {
    operations,
    balance,
    subAccounts,
    spendableBalance: balance,
    blockHeight,
    lastSyncDate: new Date(),
    tezosResources,
    nfts,
  };

  return accountShape;
};

const txToOp = ({ address, id: accountId }) => (
  tx: APIOperation
): ?Operation => {
  let type;
  let maybeValue;
  let senders = [];
  let recipients = [];
  const hasFailed = tx.status ? tx.status !== "applied" : false;

  switch (tx.type) {
    case "transaction": {
      const initiator = tx.initiator?.address;
      const from = tx.sender?.address;
      const to = tx.target?.address;
      if (from !== address && to !== address && initiator !== address) {
        // failsafe for a case that shouldn't happen.
        console.warn("found tx is unrelated to account! " + tx.hash);
        return;
      }
      senders = [from || initiator || ""];
      recipients = [to || ""];
      if (
        (from === address && to === address) || // self tx
        (from !== address && to !== address) // initiator but not in from/to
      ) {
        // we just pay fees in that case
        type = "FEES";
      } else {
        type = to === address ? "IN" : "OUT";
        if (!hasFailed) {
          maybeValue = BigNumber(tx.amount || 0);
          if (maybeValue.eq(0)) {
            type = "FEES";
          }
        }
      }
      break;
    }
    case "delegation":
      type = tx.newDelegate ? "DELEGATE" : "UNDELEGATE";
      senders = [address];
      // convention was to use recipient for the new delegation address or "" if undelegation
      recipients = [tx.newDelegate ? tx.newDelegate.address : ""];
      break;
    case "reveal":
      type = "REVEAL";
      senders = [address];
      recipients = [address];
      break;
    case "migration":
      type = tx.balanceChange < 0 ? "OUT" : "IN";
      maybeValue = BigNumber(Math.abs(tx.balanceChange || 0));
      senders = [address];
      recipients = [address];
      break;
    case "origination":
      type = "CREATE";
      maybeValue = BigNumber(tx.contractBalance || 0);
      senders = [address];
      recipients = [tx.originatedContract.address];
      break;
    case "activation":
      type = "IN";
      senders = [address];
      recipients = [address];
      maybeValue = BigNumber(tx.balance || 0);
      break;
    // TODO more type of tx
    default:
      console.warn("unsupported tx:", tx);
      return;
  }

  let {
    id,
    hash,
    allocationFee,
    bakerFee,
    storageFee,
    level: blockHeight,
    block: blockHash,
    timestamp,
  } = tx;

  if (!hash) {
    // in migration case, there is no hash...
    hash = "";
  }

  let value = maybeValue || BigNumber(0);
  if (type === "IN" && value.eq(0)) {
    return; // not interesting op
  }

  let fee = BigNumber(bakerFee || 0);

  if (!hasFailed) {
    fee = fee.plus(allocationFee || 0).plus(storageFee || 0);
  }

  if (type !== "IN") {
    value = value.plus(fee);
  }

  return {
    id: encodeOperationId(accountId, hash, type),
    hash,
    type,
    value,
    fee,
    senders,
    recipients,
    blockHeight,
    blockHash,
    accountId,
    date: new Date(timestamp),
    extra: {
      id,
    },
    hasFailed,
  };
};

const fetchAllTransactions = async (
  address: string,
  lastId?: number
): Promise<APIOperation[]> => {
  let r;
  let txs: APIOperation[] = [];
  let maxIteration = 20; // safe limit
  do {
    r = await api.getAccountOperations(address, { lastId, sort: 0 });
    if (r.length === 0) return txs;
    txs = txs.concat(r);
    lastId = txs[txs.length - 1].id;
    if (!lastId) {
      log("tezos", "id missing!");
      return txs;
    }
  } while (--maxIteration);
  return txs;
};
