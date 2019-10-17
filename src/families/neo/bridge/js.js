// @flow
import { Observable } from "rxjs";
import { BigNumber } from "bignumber.js";
import flatMap from "lodash/flatMap";
import { log } from "@ledgerhq/logs";
import { CurrencyNotSupported } from "@ledgerhq/errors";
import type { Operation } from "../../../types";
import type { Transaction } from "../types";
import type { CurrencyBridge, AccountBridge } from "../../../types/bridge";
import { parseCurrencyUnit, getCryptoCurrencyById } from "../../../currencies";
import { inferDeprecatedMethods } from "../../../bridge/deprecationUtils";
import network from "../../../network";
import { open } from "../../../hw";
import signTransaction from "../../../hw/signTransaction";
import getAddress from "../../../hw/getAddress";
import {
  makeStartSync,
  makeScanAccountsOnDevice
} from "../../../bridge/jsHelpers";
import { getPublicKeyEncoded } from "../hw-app-neo/crypto";
import Neon, { api, wallet } from "@cityofzion/neon-js";

//https://github.com/CityOfZion/neo-tokens/blob/master/tokenList.json
const neoAsset =
  "c56f33fc6ecfcd0c225c4ab356fee59390af8560be0e930faebe74a6daff7c9b";
const neoUnit = getCryptoCurrencyById("neo").units[0];

const txToOps = ({ id, address }) => (tx: Object): Operation[] => {
  const ops = [];
  if (tx.asset !== neoAsset) return ops;

  const hash = tx.txid;
  const date = new Date(tx.time * 1000);
  const value = parseCurrencyUnit(neoUnit, tx.amount);
  const from = tx.address_from;
  const to = tx.address_to;
  const sending = address === from;
  const receiving = address === to;
  const fee = BigNumber(0);
  if (sending) {
    ops.push({
      id: `${id}-${hash}-OUT`,
      hash,
      type: "OUT",
      value: value.plus(fee),
      fee,
      blockHeight: tx.block_height,
      blockHash: null,
      accountId: id,
      senders: [from],
      recipients: [to],
      date,
      extra: {}
    });
  }
  if (receiving) {
    ops.push({
      id: `${id}-${hash}-IN`,
      hash,
      type: "IN",
      value,
      fee,
      blockHeight: tx.block_height,
      blockHash: null,
      accountId: id,
      senders: [from],
      recipients: [to],
      date,
      extra: {}
    });
  }

  return ops;
};

const root = "https://api.neoscan.io";

async function fetch(path) {
  const url = root + path;
  const { data } = await network({
    method: "GET",
    url
  });
  log("http", url);
  return data;
}

async function fetchBalances(addr: string) {
  const data = await fetch(`/api/main_net/v1/get_balance/${addr}`);
  return data.balance;
}

async function fetchBlockHeight() {
  const data = await fetch("/api/main_net/v1/get_height");
  return data.height;
}

async function fetchTxs(
  addr: string,
  shouldFetchMoreTxs: (Operation[]) => boolean
) {
  let i = 0;
  const load = () =>
    fetch(`/api/main_net/v1/get_address_abstracts/${addr}/${i + 1}`);

  let payload = await load();
  let txs = [];
  while (payload && i < payload.total_pages && shouldFetchMoreTxs(txs)) {
    txs = txs.concat(payload.entries);
    i++;
    payload = await load();
  }
  return txs;
}

const getAccountShape = async info => {
  const blockHeight = await fetchBlockHeight();

  const balances = await fetchBalances(info.address);
  if (balances.length === 0) {
    return { balance: BigNumber(0) };
  }
  const balanceMatch = balances.find(b => b.asset_hash === neoAsset);
  const balance = balanceMatch
    ? parseCurrencyUnit(neoUnit, String(balanceMatch.amount))
    : BigNumber(0);

  const txs = await fetchTxs(info.address, txs => txs.length < 1000);

  const operations = flatMap(txs, txToOps(info));

  return {
    balance,
    operations,
    blockHeight
  };
};

const scanAccountsOnDevice = makeScanAccountsOnDevice(getAccountShape);

const startSync = makeStartSync(getAccountShape);

const currencyBridge: CurrencyBridge = {
  scanAccountsOnDevice
};

const createTransaction = () => ({
  family: "neo",
  amount: BigNumber(0),
  recipient: ""
});

const updateTransaction = (t, patch) => ({ ...t, ...patch });

const getTransactionStatus = a =>
  Promise.reject(
    new CurrencyNotSupported("neo currency not supported", {
      currencyName: a.currency.name
    })
  );

async function doSignAndBroadcast({
  a,
  t,
  deviceId,
  isCancelled,
  onSigned,
  onOperationBroadcasted
}) {
  // Prepare transaction
  const mainNetNeoscan = new api.neoscan.instance("MainNet");
  const balance = await mainNetNeoscan.getBalance(a.freshAddress);
  const neonTx = Neon.create.contractTx();
  // TODO: we can use calculationStrategyFunction and fees (default) fields
  // on calculate method to tweak fees
  // Reference: https://github.com/CityOfZion/neon-js/blob/master/packages/neon-core/src/tx/transaction/BaseTransaction.ts#L141
  neonTx.addIntent("NEO", t.amount.toNumber(), t.recipient).calculate(balance); //Possible to set config about fees
  const unsignedRawTx = neonTx.serialize(false);

  const transport = await open(deviceId);
  let rawSignedTransaction;
  try {
    // Get verification script
    const addressResult = await getAddress(transport, {
      currency: a.currency,
      path: a.freshAddressPath,
      derivationMode: a.derivationMode
    });
    const compPubKey = getPublicKeyEncoded(addressResult.publicKey);
    const verificationScript = wallet.getVerificationScriptFromPublicKey(
      compPubKey
    );
    // Get signature to construct invocation script
    const signature = await signTransaction(
      a.currency,
      transport,
      a.freshAddressPath,
      unsignedRawTx
    );
    const invocationScript = `40${signature}`;
    neonTx.scripts.push({ invocationScript, verificationScript });
    // Get raw signed transaction
    rawSignedTransaction = neonTx.serialize(true);
  } finally {
    transport.close();
  }

  if (!isCancelled()) {
    onSigned();
    // Broadcast
    const submittedPayment = await broadcastNeonTx(rawSignedTransaction);
    if (submittedPayment.result !== true) {
      throw new Error(submittedPayment.error);
    }
    const hash = neonTx.hash();
    const fees = neonTx.fees();
    const operation = {
      id: `${a.id}-${hash}-OUT`,
      hash,
      accountId: a.id,
      type: "OUT",
      value: t.amount,
      fee: BigNumber(fees),
      blockHash: null,
      blockHeight: null,
      senders: [a.freshAddress],
      recipients: [t.recipient],
      date: new Date(),
      extra: {}
    };
    onOperationBroadcasted(operation);
  }
}

const broadcastNeonTx = async (rawSignedTransaction: string) => {
  const rpcClient = Neon.create.rpcClient(
    "https://seed1.switcheo.network:10331"
  );
  const result = await rpcClient.sendRawTransaction(rawSignedTransaction);
  return result;
};

const signAndBroadcast = (a, t, deviceId) =>
  Observable.create(o => {
    let cancelled = false;
    const isCancelled = () => cancelled;
    const onSigned = () => {
      o.next({ type: "signed" });
    };
    const onOperationBroadcasted = operation => {
      o.next({ type: "broadcasted", operation });
    };
    doSignAndBroadcast({
      a,
      t,
      deviceId,
      isCancelled,
      onSigned,
      onOperationBroadcasted
    }).then(
      () => {
        o.complete();
      },
      e => {
        o.error(e);
      }
    );
    return () => {
      cancelled = true;
    };
  });

const prepareTransaction = async (a, t: Transaction): Promise<Transaction> =>
  Promise.resolve(t);

const getCapabilities = () => ({
  canSync: true,
  canSend: false
});

const accountBridge: AccountBridge<Transaction> = {
  createTransaction,
  updateTransaction,
  prepareTransaction,
  getTransactionStatus,
  startSync,
  signAndBroadcast,
  getCapabilities,
  ...inferDeprecatedMethods({
    name: "NeoJSBridge",
    createTransaction,
    getTransactionStatus,
    prepareTransaction
  })
};

export default { currencyBridge, accountBridge };
