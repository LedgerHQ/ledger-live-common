// abstract explorer api used, abstract batching logic, pagination, and retries
export interface IExplorer {
  getAddressTransactionsSinceBlock(
    address,
    block: { blockHash: string; blockHeight: number }
  ): Array;
};
