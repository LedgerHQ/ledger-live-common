import { IExplorer } from "./types";
import EventEmitter from "../utils/eventemitter";
import { Address, TX } from "../storage/types";
import axios, { AxiosInstance } from "axios";
import axiosRetry from "axios-retry";
import https from "https";
import { findIndex } from "lodash";
import { batch } from "react-redux";

// an Live explorer V3 class
class LedgerV3Dot2Dot4 extends EventEmitter implements IExplorer {
  client: AxiosInstance;
  disableBatchSize: boolean = false;

  constructor({ explorerURI, disableBatchSize }) {
    super();

    this.client = axios.create({
      baseURL: explorerURI,
      // uses max 20 keep alive request in parallel
      httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 20 }),
    });
    // 3 retries per request
    axiosRetry(this.client, { retries: 3 });

    this.disableBatchSize = disableBatchSize;
  }

  async broadcast(tx: string) {
    const url = "/transactions/send";
    return this.client.post(url, { tx });
  }

  async getTxHex(txId: string) {
    const url = `/transactions/${txId}/hex`;

    this.emit("fetching-transaction-tx", { url, txId });

    // TODO add a test for failure (at the sync level)
    const res = (await this.client.get(url)).data;

    return res[0].hex;
  }

  async getAddressTxsSinceLastTxBlock(
    batchSize: number,
    address: Address,
    lastTx: TX | undefined
  ) {
    const params = {
      no_token: "true",
    };
    if (!this.disableBatchSize) {
      params["batch_size"] = batchSize;
    }
    if (lastTx) {
      params["block_hash"] = lastTx.block.hash;
    }

    const url = `/addresses/${address.address}/transactions`;

    this.emit("fetching-address-transaction", { url, params });

    // TODO add a test for failure (at the sync level)
    const res: { txs: TX[] } = (
      await this.client.get(url, {
        params,
      })
    ).data;

    // explorer returns pending tx without block at the beginning of any request
    // we get rid of them
    const firstNonPendingIndex = findIndex(res.txs, (tx) => !!tx.block);

    const txs = res.txs.slice(firstNonPendingIndex, res.txs.length);

    txs.forEach((tx) => {
      // no need to keep that as it changes
      delete tx["confirmations"];

      tx.account = address.account;
      tx.index = address.index;
      tx.address = address.address;

      tx.outputs.forEach((output) => {
        output.output_hash = tx.id;
      });
    });

    this.emit("fetched-address-transaction", { url, params, txs });

    return txs;
  }
}

export default LedgerV3Dot2Dot4;
