// abstract explorer api used, abstract batching logic, pagination, and retries
export interface IExplorer {
  getNAddressTransactionsSinceBlockExcludingBlock(
    batchSize: number,
    address,
    block: { blockHash: string; blockHeight: number }
  ): Array;
};
