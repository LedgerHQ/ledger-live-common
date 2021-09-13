import { $Shape } from "utility-types";
import type {
  TX,
  Currency,
  Input as WalletInput,
  Output as WalletOutput,
} from "@ledgerhq/wallet-btc";
import { BigNumber } from "bignumber.js";
import Btc from "@ledgerhq/hw-app-btc";
import { log } from "@ledgerhq/logs";
import type {
  Account,
  Operation,
  OperationType,
  DerivationMode,
} from "../../types";
import type { GetAccountShape } from "../../bridge/jsHelpers";
import { makeSync, makeScanAccounts, mergeOps } from "../../bridge/jsHelpers";
import { findCurrencyExplorer } from "../../api/Ledger";
import { encodeOperationId } from "../../operation";
import { BitcoinOutput } from "./types";
import { perCoinLogic } from "./logic";
import wallet from "./wallet";

// Map LL's DerivationMode to wallet-btc's Account.params.derivationMode
const toWalletDerivationMode = (
  mode: DerivationMode
): "Legacy" | "SegWit" | "Native SegWit" => {
  switch (mode) {
    case "segwit":
    case "segwit_on_legacy":
    case "segwit_unsplit":
    case "bch_on_bitcoin_segwit":
    case "vertcoin_128_segwit":
      return "SegWit";

    case "native_segwit":
      return "Native SegWit";

    default:
      return "Legacy";
  }
};

// Map LL's currency ID to wallet-btc's Account.params.network
const toWalletNetwork = (currencyId: string): "testnet" | "mainnet" => {
  return ["bitcoin_testnet"].includes(currencyId) ? "testnet" : "mainnet";
};

// Map wallet-btc's Output to LL's BitcoinOutput
const fromWalletUtxo = (utxo: WalletOutput): BitcoinOutput => {
  return {
    hash: utxo.output_hash,
    outputIndex: utxo.output_index,
    blockHeight: utxo.block_height,
    address: utxo.address,
    value: new BigNumber(utxo.value),
    rbf: utxo.rbf,
    isChange: false, // wallet-btc limitation: doesn't provide it
  };
};

// wallet-btc limitation: returns all transactions twice (for each side of the tx)
// so we need to deduplicate them...
const deduplicateOperations = (
  operations: (Operation | undefined)[]
): Operation[] => {
  const seen = {};
  const out: Operation[] = [];
  let j = 0;

  for (const operation of operations) {
    if (operation) {
      if (seen[operation.id] !== 1) {
        seen[operation.id] = 1;
        out[j++] = operation;
      }
    }
  }

  return out;
};

const mapTxToOperations = (
  tx: TX,
  currencyId: string,
  accountId: string,
  accountAddresses: string[],
  changeAddresses: string[]
): $Shape<Operation[]> => {
  const operations: Operation[] = [];
  const hash = tx.hash;
  const fee = new BigNumber(tx.fees);
  const blockHeight = tx.block?.height;
  const blockHash = tx.block?.hash;
  const date = new Date(tx.block?.time || tx.received_at);
  const senders: string[] = [];
  const recipients: string[] = [];
  let type: OperationType = "OUT";
  let value = new BigNumber(0);
  const hasFailed = false;
  const accountInputs: WalletInput[] = [];
  const accountOutputs: WalletOutput[] = [];
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

  // All inputs of a same transaction have the same sequence
  const transactionSequenceNumber =
    (accountInputs.length > 0 && accountInputs[0].sequence) || undefined;
  const hasSpentNothing = value.eq(0);

  for (const output of tx.outputs) {
    if (output.address) {
      if (accountAddresses.includes(output.address)) {
        accountOutputs.push(output);

        if (changeAddresses.includes(output.address)) {
          if (
            (recipients.length === 0 &&
              output.output_hash ===
                tx.outputs[tx.outputs.length - 1].output_hash) || // Is that condition safe?
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
      transactionSequenceNumber,
      accountId,
      date,
      hasFailed,
      extra: {},
    });
  }

  if (accountOutputs.length > 0) {
    // It's a RECEIVE operation
    const filterChangeAddresses = !!accountInputs.length;
    let accountOutputCount = 0;
    let finalAmount = new BigNumber(0);

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
        transactionSequenceNumber,
        accountId,
        date,
        hasFailed,
        extra: {},
      });
    }
  }

  return operations;
};

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
  const paramXpub = initialAccount?.xpub;

  // In case we get a full derivation path, extract the seed identification part
  // 44'/0'/0'/0/0 --> 44'/0'
  // FIXME Only the CLI provides a full derivationPath: why?
  const rootPath = derivationPath.split("/", 2).join("/");

  const walletNetwork = toWalletNetwork(currency.id);
  const walletDerivationMode = toWalletDerivationMode(derivationMode);
  const explorer = findCurrencyExplorer(currency);
  if (!explorer) {
    throw new Error(`No explorer found for currency ${currency.name}`);
  }
  if (explorer.version !== "v2" && explorer.version !== "v3") {
    throw new Error(`Unsupported explorer version ${explorer.version}`);
  }

  const walletAccount = initialAccount?.bitcoinResources?.serializedData
    ? await wallet.importFromSerializedAccount(
        initialAccount.bitcoinResources.serializedData
      )
    : await wallet.generateAccount({
        btc: (!paramXpub && transport && new Btc(transport)) || undefined,
        xpub: paramXpub,
        path: rootPath,
        index,
        currency: <Currency>currency.id,
        network: walletNetwork,
        derivationMode: walletDerivationMode,
        explorer: explorer && `ledger${explorer.version}`,
        explorerURI: `${explorer.endpoint}/blockchain/${explorer.version}/${explorer.id}`,
        storage: "mock",
        storageParams: [],
      });
  const xpub = paramXpub || walletAccount.xpub.xpub;
  const oldOperations = initialAccount?.operations || [];
  await wallet.syncAccount(walletAccount);
  const balance = await wallet.getAccountBalance(walletAccount);
  const currentBlock = await walletAccount.xpub.explorer.getCurrentBlock();
  const blockHeight = currentBlock?.height;

  // @ts-expect-error return from wallet-btc should be typed
  const { txs: transactions } = await wallet.getAccountTransactions(
    walletAccount
  );
  const accountAddressesWithInfo = await walletAccount.xpub.getXpubAddresses();
  const accountAddresses = accountAddressesWithInfo
    ? accountAddressesWithInfo.map((a) => a.address)
    : [];
  const changeAddressesWithInfo =
    await walletAccount.xpub.storage.getUniquesAddresses({
      account: 1,
    });
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
  const newUniqueOperations = deduplicateOperations(newOperations);
  const operations = mergeOps(oldOperations, newUniqueOperations);
  const rawUtxos = await wallet.getAccountUnspentUtxos(walletAccount);
  const utxos = rawUtxos.map(fromWalletUtxo);
  const serializedData = await wallet.exportToSerializedAccount(walletAccount);
  return {
    id: accountId,
    xpub,
    balance,
    spendableBalance: balance,
    operations,
    operationsCount: operations.length,
    blockHeight,
    bitcoinResources: {
      utxos,
      serializedData,
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
      synced.freshAddress = syncReplaceAddress(synced.freshAddress);
      synced.freshAddresses = synced.freshAddresses.map((a) => ({
        ...a,
        address: syncReplaceAddress(a.address),
      }));
      if (synced.bitcoinResources) {
        synced.bitcoinResources.utxos = synced.bitcoinResources?.utxos.map(
          (u) => ({
            ...u,
            address: u.address && syncReplaceAddress(u.address),
          })
        );
      }
    }
  }

  log("bitcoin/postSync", "bitcoinResources DONE");
  return synced;
};

export const scanAccounts = makeScanAccounts(getAccountShape);
export const sync = makeSync(getAccountShape, postSync);
