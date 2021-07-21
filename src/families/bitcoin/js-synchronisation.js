import type { TX, Output as WalletOutput } from "wallet-btc/storage/types";
import WalletLedger from "wallet-btc";
import { BigNumber } from "bignumber.js";

import Transport from "@ledgerhq/hw-transport";
import Btc from "@ledgerhq/hw-app-btc";
import { log } from "@ledgerhq/logs";

import type { Account, Operation, OperationType } from "../../types";
import type { GetAccountShape } from "../../bridge/jsHelpers";
import { makeSync, makeScanAccounts, mergeOps } from "../../bridge/jsHelpers";
import { findCurrencyExplorer } from "../../api/Ledger";
import { encodeOperationId } from "../../operation";

import { requiresSatStackReady } from "./satstack";
import { BitcoinOutput } from "./types";
import { perCoinLogic } from "./logic";

const DEBUGZ = false;

let wallet = null; // TODO We'll probably need this instance in other places too

function getWallet() {
  if (!wallet) {
    wallet = new WalletLedger();
  }
  return wallet;
}

// FIXME wallet-btc returns all transactions twice (for each side of the tx), need to deduplicate them
function FIXME_deduplicateOperations(operations: Operation[]): Operation[] {
  var seen = {};
  var out = [];
  var j = 0;
  for (const operation of operations) {
    if (seen[operation.id] !== 1) {
      seen[operation.id] = 1;
      out[j++] = operation;
    }
  }
  return out;
}

// Map LL's DerivationMode to wallet-btc's Account.derivationMode
const toWalletDerivationMode = (mode: string): string => {
  switch (mode) {
    case "segwit":
      return "SegWit";
    case "native_segwit":
      return "Native SegWit";
    default:
      return "Legacy";
  }
};

// Map LL's BitcoinOutput to wallet-btc's Output
function fromWalletUtxo(utxo: WalletOutput): BitcoinOutput {
  /*
    {
      value: string;
      address: string;
      output_hash: string;
      output_index: number;
      script_hex: string;
    }
    TO
    {
      hash: string,
      outputIndex: number,
      blockHeight: ?number,
      address: ?string,
      path: ?string,
      value: BigNumber,
      rbf: boolean,
    }
  */
  return {
    hash: utxo.output_hash,
    outputIndex: utxo.output_index,
    //blockHeight: TODO,
    address: utxo.address,
    //path: TODO,
    value: BigNumber(utxo.value),
    //rbf: TODO,
  };
}

// TODO Optimize a bit this near-spaghetti code?
function mapTxToOperations(
  tx: TX,
  currencyId: string,
  accountId: string,
  accountAddresses: string[],
  changeAddresses: string[]
): $Shape<Operation[]> {
  // FIXME What is the structure of tx ??? Doesn't match TX type...
  //DEBUGZ && console.log("XXX - mapTxToOperation - input tx:");
  //DEBUGZ && console.log(tx);
  //DEBUGZ && console.log("-------------------------------");

  const operations = [];

  const hash = tx.hash;
  const fee = BigNumber(tx.fees);
  const blockHeight = tx.block.height;
  const blockHash = tx.block.hash;
  const date = new Date(tx.block.time);
  const senders = [];
  const recipients = [];
  let type: OperationType = "OUT";
  let value = BigNumber(0);
  let hasFailed = false;

  const accountInputs = [];
  const accountOutputs = [];

  const syncReplaceAddress = perCoinLogic[currencyId]?.syncReplaceAddress;

  for (const input of tx.inputs) {
    if (input.address) {
      senders.push(
        syncReplaceAddress ? syncReplaceAddress(input.address) : input.address
      );

      if (input.value) {
        if (accountAddresses.includes(input.address)) {
          // This address is part of the account
          value = value.plus(input.value);
          accountInputs.push(input);
        }
      }
    }
  }

  const hasSpentNothing = value.eq(0);

  for (const output of tx.outputs) {
    if (output.address) {
      if (accountAddresses.includes(output.address)) {
        accountOutputs.push(output);

        if (changeAddresses.includes(output.address)) {
          if (
            (recipients.length === 0 &&
              output.output_hash ===
                tx.outputs[tx.outputs.length - 1].output_hash) || // FIXME Is that condition safe??
            hasSpentNothing
          ) {
            recipients.push(
              syncReplaceAddress
                ? syncReplaceAddress(output.address)
                : output.address
            );
          }
        } else {
          recipients.push(
            syncReplaceAddress
              ? syncReplaceAddress(output.address)
              : output.address
          );
        }
      } else {
        recipients.push(
          syncReplaceAddress
            ? syncReplaceAddress(output.address)
            : output.address
        );
      }
    }
  }

  if (accountInputs.length > 0) {
    // It's a SEND operation
    for (const output of accountOutputs) {
      if (changeAddresses.includes(output.address)) {
        value = value.minus(output.value);
      }
    }

    type = "OUT";

    operations.push({
      id: encodeOperationId(accountId, hash, type),
      hash,
      type,
      value,
      fee,
      senders,
      recipients,
      blockHeight,
      blockHash,
      //transactionSequenceNumber, // FIXME Relevant or not for btc?
      accountId,
      date,
      //extra, // FIXME Required or not for btc?
      hasFailed,
    });
  }

  if (accountOutputs.length > 0) {
    // It's a RECEIVE operation

    const filterChangeAddresses = !!accountInputs.length;
    let accountOutputCount = 0;
    let finalAmount = BigNumber(0);

    for (const output of accountOutputs) {
      if (!filterChangeAddresses || !changeAddresses.includes(output.address)) {
        finalAmount = finalAmount.plus(output.value);
        accountOutputCount += 1;
      }
    }

    if (accountOutputCount > 0) {
      value = finalAmount;
      type = "IN";

      operations.push({
        id: encodeOperationId(accountId, hash, type),
        hash,
        type,
        value,
        fee,
        senders,
        recipients,
        blockHeight,
        blockHash,
        //transactionSequenceNumber, // FIXME Relevant or not for btc?
        accountId,
        date,
        //extra, // FIXME Required or not for btc?
        hasFailed,
      });
    }
  }

  //DEBUGZ && console.log("XXX - mapTxToOperation - output operations:");
  //DEBUGZ && console.log(operations);
  return operations;
}

const getAccountShape: GetAccountShape = async (info) => {
  const {
    transport,
    currency,
    id: accountId,
    index,
    derivationPath,
    derivationMode,
    initialAccount,
  } = info;

  //DEBUGZ && console.log("XXX - getAccountShape - info:", info);

  const FIXME_derivationMode = toWalletDerivationMode(derivationMode);

  // FIXME Hack because makeScanAccounts doesn't support non-account based coins
  // Replaces the full derivation path with only the seed identification part
  // 44'/0'/0'/0/0 --> 44'/0'
  const path = derivationPath.split("/", 2).join("/");

  if (currency.id === "bitcoin") {
    await requiresSatStackReady();
  }

  const wallet = getWallet();

  const FIXME_network =
    currency.id === "bitcoin_testnet" ? "testnet" : "mainnet";

  const explorer = findCurrencyExplorer(currency);
  const {
    endpoint: explorerEndpoint,
    version: explorerVersion,
    id: explorerId,
  } = explorer;

  const FIXME_explorerId = explorer.id === "v2" ? "ledgerv2" : "ledgerv3";

  const paramXpub = initialAccount?.xpub;
  const walletAccount = await wallet.generateAccount({
    btc: !paramXpub && new Btc(transport),
    xpub: paramXpub,
    path,
    index,
    network: FIXME_network,
    derivationMode: FIXME_derivationMode,
    explorer: FIXME_explorerId,
    explorerURI: `${explorerEndpoint}/blockchain/${explorerVersion}/${explorerId}`,
    storage: "mock",
    storageParams: [],
  });

  const xpub = paramXpub || walletAccount.xpub.xpub;

  const oldOperations = initialAccount?.operations || [];
  // FIXME Test incremental sync
  /*
  const startAt = oldOperations.length
    ? (oldOperations[0].blockHeight || 0) + 1
    : 0;
  */

  await wallet.syncAccount(walletAccount);

  const balance = await wallet.getAccountBalance(walletAccount);

  const latestTx = await walletAccount.xpub.storage.getLastTx({
    account: index,
  });
  const blockHeight = latestTx?.block?.height;

  const transactions = await wallet.getAccountTransactions(walletAccount);

  const accountAddressesWithInfo = await walletAccount.xpub.getXpubAddresses();
  const accountAddresses = accountAddressesWithInfo
    ? accountAddressesWithInfo.map((a) => a.address)
    : [];

  const changeAddressesWithInfo = await walletAccount.xpub.storage.getUniquesAddresses(
    { account: 1 }
  );
  const changeAddresses = changeAddressesWithInfo
    ? changeAddressesWithInfo.map((a) => a.address)
    : [];

  const newOperations = transactions
    ?.map((tx) =>
      mapTxToOperations(
        tx,
        currency.id,
        accountId,
        accountAddresses,
        changeAddresses
      )
    )
    .flat();

  const newUniqueOperations = FIXME_deduplicateOperations(newOperations);

  const operations = mergeOps(oldOperations, newUniqueOperations);

  const rawUtxos = await wallet.getAccountUnspentUtxos(walletAccount);
  const utxos = rawUtxos.map(fromWalletUtxo);

  return {
    id: accountId,
    xpub,
    balance,
    spendableBalance: balance, // FIXME May need to compute actual value
    operations,
    operationsCount: operations.length,
    blockHeight,
    bitcoinResources: {
      utxos,
    },
  };
};

const postSync = (initial: Account, synced: Account) => {
  /* FIXME Would need postSync to be async
  if (isSatStackEnabled() && synced.currency.id === "bitcoin") {
    const inferred = inferDescriptorFromAccount(synced);
    if (inferred) {
      const exists = await checkDescriptorExists(inferred.internal);
      if (!exists) {
        throw new SatStackDescriptorNotImported();
      }
    }
  }
  */

  log("bitcoin/postSync", "bitcoinResources");

  const perCoin = perCoinLogic[synced.currency.id];
  if (perCoin) {
    const { postBuildBitcoinResources, syncReplaceAddress } = perCoin;
    if (postBuildBitcoinResources) {
      synced.bitcoinResources = postBuildBitcoinResources(
        synced,
        synced.bitcoinResources
      );
    }
    if (syncReplaceAddress) {
      synced.freshAddress = syncReplaceAddress(synced, synced.freshAddress);

      synced.freshAddresses = synced.freshAddresses.map((a) => ({
        ...a,
        address: syncReplaceAddress(synced, a.address),
      }));

      synced.bitcoinResources.utxos = synced.bitcoinResources.utxos.map(
        (u) => ({
          ...u,
          address: u.address && syncReplaceAddress(synced, u.address),
        })
      );
    }
  }

  log("bitcoin/postSync", "bitcoinResources DONE");

  return synced;
};

export const scanAccounts = makeScanAccounts(getAccountShape);

export const sync = makeSync(getAccountShape, postSync);
