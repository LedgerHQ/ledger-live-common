export type APITransaction = {
  fees: string;
  hash: string;
  timestamp: string;
  blockHeight: number;
  absSlot: number;
  inputs: Array<{
    txId: string;
    index: number;
    address: string;
    value: string;
    paymentKey: string;
    tokens: Array<{ assentName: string; policyId: string; value: string }>;
  }>;
  outputs: Array<{
    address: string;
    value: string;
    paymentKey: string;
    tokens: Array<{ assentName: string; policyId: string; value: string }>;
  }>;
};

export type APIFetchTransactions = {
  pageNo: number;
  limit: number;
  blockHeight: number;
  transactions: Array<APITransaction>;
};
