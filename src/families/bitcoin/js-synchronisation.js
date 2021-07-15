import { BigNumber } from "bignumber.js";
import type { Account, Operation, OperationType } from "../../types";
import type { GetAccountShape } from "../../bridge/jsHelpers";
import { makeSync, makeScanAccounts, mergeOps } from "../../bridge/jsHelpers";
import { encodeOperationId } from "../../operation";
//import { fromBitcoinOutputRaw } from "./serialization";
import { perCoinLogic } from "./logic";

import type { TX, Output } from "wallet-btc/storage/types";
//import { getAccount, getTransactions } from "./api/ledgerApi";
import { getEnv } from "../../env";
import { requiresSatStackReady } from "./satstack";
import { BitcoinOutput } from "./types";
//import { open, close } from "./../../hw";
import Transport from "@ledgerhq/hw-transport";
import Btc from "@ledgerhq/hw-app-btc";
// prettier-ignore
//const WalletLedger = require('./wallet/index.ts').WalletLedger;
import type { Account as WalletAccount } from "wallet-btc";
import WalletLedger from "wallet-btc";
import { SatStackDescriptorNotImported } from "../../errors";
import { isSatStackEnabled, checkDescriptorExists } from "./satstack";
import { inferDescriptorFromAccount } from "./descriptor";

const DEBUGZ = true;

const FIXME_mapToWalletBtcDerivationMode = (llMode: string): string => {
  switch (llMode) {
    case "segwit":
      return "SegWit";
    case "native_segwit":
      return "Native SegWit";
    default:
      return "Legacy";
  }
};

// FIXME Need actual implementation
const FIXME_isChangeAddress = (address: string): boolean => {
  return false;
};

// TODO Optimize a bit this near-spaghetti code?
function mapTxToOperation(
  tx: TX,
  currencyId: string,
  accountId: string,
  accountAddresses: string[]
  //walletAccount: WalletAccount
): $Shape<Operation> {
  // FIXME What is the structure of tx ??? Doesn't match TX type...
  //DEBUGZ && console.log("XXX - mapTxToOperation - input tx:");
  //DEBUGZ && console.log(tx);
  //DEBUGZ && console.log("-------------------------------");

  const hash = tx.hash;
  const fee = BigNumber(tx.fees);
  const blockHeight = tx.block.height;
  const blockHash = tx.block.hash;
  const date = new Date(tx.received_at);
  const senders = [];
  const recipients = [];
  let type: OperationType = "OUT"; // TODO Done?
  let value = BigNumber(0); // TODO Done?
  let hasFailed = false; // TODO

  const accountInputs = [];
  const accountOutputs = [];
  let sentAmount = BigNumber(0);
  let receivedAmount = BigNumber(0);

  const perCoin = perCoinLogic[currencyId];
  const syncReplaceAddress = perCoin?.syncReplaceAddress;

  for (const input of tx.inputs) {
    // prettier-ignore
    //DEBUGZ && console.log("XXX - mapTxToOperation - input.address: ", input.address);
    if (input.address) {
      senders.push(syncReplaceAddress ? syncReplaceAddress(input.address) : input.address);

      if (input.value) {
        // FIXME Need input.path?
        if (accountAddresses.includes(input.address)) {
          //DEBUGZ && console.log("XXX - mapTxToOperation - found account input !");
          // This address is part of the account
          sentAmount = sentAmount.plus(input.value);
          accountInputs.push(input);
        }

        /* DONE libcore impl
          auto path = _keychain->getAddressDerivationPath(input.address.getValue());
          if (path.nonEmpty()) {
              // This address is part of the account.
              sentAmount += input.value.getValue().toUint64();
              accountInputs.push_back(std::make_pair(const_cast<BitcoinLikeBlockchainExplorerInput *>(&input), DerivationPath(path.getValue())));
          }
        */
      }
    }
  }

  const hasSpentNothing = sentAmount.eq(0);

  for (const output of tx.outputs) {
    if (output.address) {
      //recipients.push(output.address); // FIXME Quick & dirty version, need actual code below

      // FIXME Need output.path?
      if (accountAddresses.includes(output.address)) {
        accountOutputs.push(output);

        if (FIXME_isChangeAddress(output.address)) {
          if (hasSpentNothing) {
            receivedAmount = receivedAmount.plus(output.value);
          }
          if (
            (recipients.length === 0 &&
              output === tx.outputs[tx.outputs.length - 1]) || // FIXME Is that condition safe??
            hasSpentNothing
          ) {
            recipients.push(
              syncReplaceAddress
                ? syncReplaceAddress(output.address)
                : output.address
            );
          }
        } else {
          receivedAmount = receivedAmount.plus(output.value);
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

  /* DONE libcore impl
    for (auto index = 0; index < outputCount; index++) {
      auto& output = transaction.outputs[index];
      if (output.address.nonEmpty()) {
        auto path = _keychain->getAddressDerivationPath(output.address.getValue());
        if (path.nonEmpty()) {

          DerivationPath p(path.getValue());
          accountOutputs.push_back(std::make_pair(const_cast<BitcoinLikeBlockchainExplorerOutput *>(&output), p));
          if (p.getNonHardenedChildNum(nodeIndex) == 1) {
            if (hasSpentNothing) {
              receivedAmount +=  output.value.toUint64();
            }
            if ((recipients.size() == 0 && index + 1 >= outputCount) || hasSpentNothing) {
              recipients.push_back(output.address.getValue());
            }
          } else {
            receivedAmount += output.value.toUint64();
            recipients.push_back(output.address.getValue());
          }
        } else {
          recipients.push_back(output.address.getValue());
        }
      }
      fees = fees - output.value.toUint64();
    }
  */

  if (accountInputs.length > 0) {
    // It's a SEND operation
    for (const output of accountOutputs) {
      if (FIXME_isChangeAddress(output.address)) {
        sentAmount = sentAmount.minus(output.value);
      }
    }
    sentAmount = sentAmount.minus(fee);

    value = sentAmount;
    type = "OUT";
  }

  /* DONE libcore impl
  if (accountInputs.size() > 0) {
    // It's a SEND operation

    for (auto& accountOutput : accountOutputs) {
      if (accountOutput.second.getNonHardenedChildNum(nodeIndex) == 1)
        sentAmount -= accountOutput.first->value.toInt64();
    }
    sentAmount -= fees;

    operation.amount.assignI64(sentAmount);
    operation.type = api::OperationType::SEND;
  }
  */

  if (accountOutputs.length > 0) {
    // It's a RECEIVE operation

    const filterChangeAddresses = !!accountInputs.length;
    let accountOutputCount = 0;
    let finalAmount = BigNumber(0);

    for (const output of accountOutputs) {
      if (!filterChangeAddresses || !FIXME_isChangeAddress(output.address)) {
        finalAmount = finalAmount.plus(output.value);
        accountOutputCount += 1;
      }
    }

    if (accountOutputCount > 0) {
      value = finalAmount;
      type = "IN";
    }
  }

  /* DONE libcore impl
  if (accountOutputs.size() > 0) {
    // It's a RECEIVE operation

    BigInt amount;
    bool filterChangeAddresses = true;

    if (accountInputs.size() == 0) {
      filterChangeAddresses = false;
    }

    BigInt finalAmount;
    auto accountOutputCount = 0;
    for (auto& o : accountOutputs) {
      if (filterChangeAddresses && o.second.getNonHardenedChildNum(nodeIndex) == 1)
        continue;
      finalAmount = finalAmount + o.first->value;
      accountOutputCount += 1;
    }
    if (accountOutputCount > 0) {
      operation.amount = finalAmount;
      operation.type = api::OperationType::RECEIVE;
      operation.refreshUid();
      if (OperationDatabaseHelper::putOperation(sql, operation))
        emitNewOperationEvent(operation);
    }
  }
  */

  // DONE Some additional logic to keep, currently used when mapping 1 tx to 1 operation
  /*
  const hash = await coreTransaction.getHash();

  const shape: $Shape<Operation> = { hash };

  const perCoin = perCoinLogic[currency.id];
  if (perCoin && perCoin.syncReplaceAddress) {
    const { syncReplaceAddress } = perCoin;
    shape.senders = partialOp.senders.map((addr) =>
      syncReplaceAddress(existingAccount, addr)
    );
    shape.recipients = partialOp.recipients.map((addr) =>
      syncReplaceAddress(existingAccount, addr)
    );
  }

  return shape;
  */

  // prettier-ignore
  const truc = {
    id: encodeOperationId(accountId, hash, type),           // OK
    hash,         // OK
    type,         // TODO
    value,        // TODO
    fee,          // OK
    senders,      // OK
    recipients,   // ~OK
    blockHeight,  // OK
    blockHash,    // OK
    //transactionSequenceNumber, // FIXME Relevant or not for btc?
    accountId,    // OK
    date,         // OK
    //extra, // FIXME Required or not for btc?
    hasFailed,    // TODO
  };
  //DEBUGZ && console.log("XXX - mapTxToOperation - output op:");
  //DEBUGZ && console.log(truc);
  //DEBUGZ && console.log("XXX - mapTxToOperation - (dummyFee): ", dummyFee);
  return truc;
}

function mapTxsToOperations(
  txs: TX[],
  currencyId: string,
  accountId: string,
  accountAddresses: string[]
  //walletAccount: WalletAccount
): $Shape<Operation>[] {
  //DEBUGZ && console.log("XXX - mapTxsToOperations - txs.length:", txs.length);
  return txs?.map((tx) =>
    mapTxToOperation(tx, currencyId, accountId, accountAddresses)
  );
}

let wallet = null; // FIXME Probably need this instance in other places too

function getWallet(transport: ?Transport) {
  if (wallet) {
    //DEBUGZ && console.log("XXX - getWallet - already initialized");
    return wallet;
  } else if (transport) {
    //DEBUGZ && console.log("XXX - getWallet - initialization");
    //const transport = await open(deviceId);
    const hwApp = new Btc(transport);
    wallet = new WalletLedger(hwApp);
    return wallet;
  } else {
    throw new Error("BTC Wallet has not been initialized");
  }
}

function fromWalletUtxo(utxo: Output): BitcoinOutput {
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

const getAccountShape: GetAccountShape = async (info) => {
  const {
    transport,
    currency,
    id,
    index,
    address,
    derivationPath,
    derivationMode,
    initialAccount,
  } = info;

  //DEBUGZ && console.log("XXX - getAccountShape - info:", info);

  const FIXME_derivationMode = FIXME_mapToWalletBtcDerivationMode(
    derivationMode
  );

  // prettier-ignore
  DEBUGZ && console.log("XXX - getAccountShape - derivationPath:", derivationPath);

  if (currency.id === "bitcoin") {
    await requiresSatStackReady();
  }

  const wallet = getWallet(transport);

  const truc = {
    path: derivationPath,
    index,
    network: "mainnet", // TODO dynamic param?
    derivationMode: FIXME_derivationMode,
    explorer: "ledgerv3", // TODO dynamic param?
    explorerParams: [getEnv("API_BITCOIN_EXPLORER_LEDGER")],
    storage: "mock",
    storageParams: [],
  };
  //DEBUGZ && console.log("XXX - getAccountShape - account data:", truc);
  const walletAccount = await wallet.generateAccount(truc);

  //DEBUGZ && console.log("XXX - getAccountShape - walletAccount - BEFORE SYNC:");
  //DEBUGZ && console.log(walletAccount);

  const xpub = walletAccount.xpub.xpub;
  //DEBUGZ && console.log("XXX - getAccountShape - xpub:", xpub);

  const oldOperations = initialAccount?.operations || [];
  const startAt = oldOperations.length
    ? (oldOperations[0].blockHeight || 0) + 1
    : 0;

  await wallet.syncAccount(walletAccount);

  //DEBUGZ && console.log("XXX - getAccountShape - walletAccount - AFTER SYNC:");
  //DEBUGZ && console.log(walletAccount);

  //const { blockHeight, balance, spendableBalance } = await wallet.getAccountBalance(walletAccount);
  const balance = await wallet.getAccountBalance(walletAccount);
  //DEBUGZ && console.log("XXX - getAccountShape - accountBalance: ", accountBalance);

  const transactions = await wallet.getAccountTransactions(walletAccount);
  const accountAddressesWithInfo = await walletAccount.xpub.getXpubAddresses();

  const accountAddresses = accountAddressesWithInfo
    ? accountAddressesWithInfo.map((a) => a.address)
    : [];
  // prettier-ignore
  //DEBUGZ && console.log("XXX - getAccountShape - accountAddresses:", accountAddresses);

  const newOperations = mapTxsToOperations(transactions, currency.id, id, accountAddresses);
  //DEBUGZ && console.log("XXX - getAccountShape - mapTxsToOperations OK");
  const operations = mergeOps(oldOperations, newOperations);

  const rawUtxos = await wallet.getAccountUnspentUtxos(walletAccount);
  //DEBUGZ && console.log("XXX - getAccountShape - rawUtxos:", rawUtxos);
  const utxos = rawUtxos.map(fromWalletUtxo);

  return {
    id,
    xpub,
    balance,
    //spendableBalance: balance, // FIXME: is this ok? --> seems unused in current BTC JS impl...
    operations,
    operationsCount: operations.length,
    blockHeight: 0, // TODO
    bitcoinResources: {
      utxos,
    },
  };
};

const postSync = (initial: Account, synced: Account) => {
  /* FIXME Needs postSync to be async
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
