import { TX, Address } from "../storage/types";

// abstract explorer api used, abstract batching logic, pagination, and retries
export interface IExplorer {
  on(event: "fetching-address-transaction", listener: () => void): this;
  on(event: "fetched-address-transaction", listener: () => void): this;

  broadcast(tx: string): Promise<any>;
  getTxHex(txId: string): Promise<string>;
  getAddressTxsSinceLastTxBlock(
    batchSize: number,
    address: Address,
    lastTx: TX | undefined,
  ): Promise<TX[]>;
};
