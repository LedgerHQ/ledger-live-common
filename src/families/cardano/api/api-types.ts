export type TransactionRaw = {
  fees: string;
  hash: string;
  inputs: Array<{
    txId: string;
    index: number;
    address: string;
    value: string;
    paymentKey: string;
    tokens: Array<{ assetId: string; policyId: string; value: string }>;
  }>;
  outputs: Array<{
    address: string;
    value: string;
    paymentKey: string;
    tokens: Array<{ assetId: string; policyId: string; value: string }>;
  }>;
  timestamp: string;
  blockHeight: number;
  metadata: any;
};
