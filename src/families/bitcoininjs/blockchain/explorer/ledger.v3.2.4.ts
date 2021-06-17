import { IExplorer } from "./types";
import EventEmitter from "../utils/eventemitter";
import { Block, TX } from "../storage/types";
import axios, { AxiosInstance } from "axios";
import axiosRetry from "axios-retry";
import https from "https";
import { findLastIndex } from "lodash";

// an Live explorer V3 class
class LedgerV3Dot2Dot4 extends EventEmitter implements IExplorer {
  client: AxiosInstance;

  constructor({ explorerURI }) {
    super();

    this.client = axios.create({
      baseURL: explorerURI,
      // uses max 20 keep alive request in parallel
      httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 20 }),
    });
    // 3 retries per request
    axiosRetry(this.client, { retries: 3 });
  }

  async getNAddressTransactionsSinceBlockExcludingBlock(
    batchSize: number,
    address: string,
    block: Block | undefined
  ) {
    const params = {
      no_token: "true",
      batch_size: batchSize,
    };
    if (block) {
      params["block_hash"] = block.hash;
    }

    const url = `/addresses/${address}/transactions`;

    this.emit("fetching-address-transaction", { url, params });

    // TODO add a test for failure (at the sync level)
    const res: { txs: TX[] } = (
      await this.client.get(url, {
        params,
      })
    ).data;

    // ledger live explorer include the transaction of the paginating block_hash used
    const txs = block
      ? res.txs.slice(
          findLastIndex(res.txs, (tx) => tx.block.hash === block.hash) + 1,
          res.txs.length
        )
      : res.txs;

    this.emit("fetched-address-transaction", { url, params, txs });

    return txs;
  }
}

export default LedgerV3Dot2Dot4;
