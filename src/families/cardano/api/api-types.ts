type APIToken = { assetName: string; policyId: string; value: string };

export type APITransaction = {
  fees: string;
  hash: string;
  timestamp: string;
  blockHeight: number;
  inputs: Array<{
    txId: string;
    index: number;
    address: string;
    value: string;
    paymentKey: string;
    tokens: Array<APIToken>;
  }>;
  outputs: Array<{
    address: string;
    value: string;
    paymentKey: string;
    tokens: Array<APIToken>;
  }>;
};
