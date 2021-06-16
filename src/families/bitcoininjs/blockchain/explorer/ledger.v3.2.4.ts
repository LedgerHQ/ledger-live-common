import { IExplorer } from "./types";
import EventEmitter from "../utils/eventemitter";
import { Block, TX } from "../storage/types";
import axios from "axios";
import https from "https";
import { findLastIndex } from "lodash";

// an Live explorer V3 class
class LedgerV3Dot2Dot4 extends EventEmitter implements IExplorer {
  explorerURI: string;
  syncAddressesParallelAddresses: number = 5;
  syncAddressesParallelRequests: number = 5;
  syncAddressesBatchSize: number = 50;
  // uses max 20 keep alive request in parallel
  httpsAgent: any = new https.Agent({ keepAlive: true, maxSockets: 20 });

  constructor({ explorerURI }) {
    super();
    this.explorerURI = explorerURI;
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

    const url = `${this.explorerURI}/addresses/${address}/transactions`;

    this.emit("fetching-address-transaction", { url, params });

    // TODO handle retries
    const res: { txs: TX[] } = (
      await axios.get(url, {
        params,
        httpsAgent: this.httpsAgent,
      })
    ).data;

    this.emit("fetched-address-transaction", { url, params, res });

    // ledger live explorer include the transaction of the paginating block_hash used
    return block
      ? res.txs.slice(
          0,
          findLastIndex(res.txs, (tx) => tx.block.hash !== block.hash)
        )
      : res.txs;
  }
}

export default LedgerV3Dot2Dot4;
