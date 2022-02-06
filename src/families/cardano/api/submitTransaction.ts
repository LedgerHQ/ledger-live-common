import BigNumber from "bignumber.js";
import axios from "./axios";

type Token = {
  assetName: string;
  policyId: string;
  amount: BigNumber;
};

type TokenRaw = {
  assetName: string;
  policyId: string;
  value: string;
};

type TransactionInput = {
  txId: string;
  index: number;
  address: string;
  amount: BigNumber;
  paymentKey: string;
  tokens: Token[];
};

type TransactionInputRaw = {
  txId: string;
  index: number;
  address: string;
  value: string;
  paymentKey: string;
  tokens: TokenRaw[];
};

type TransactionOutput = {
  address: string;
  amount: BigNumber;
  paymentKey: string;
  tokens: Token[];
};

type TransactionOutputRaw = {
  address: string;
  value: BigNumber;
  paymentKey: string;
  tokens: TokenRaw[];
};

type TransactionObject = {
  fees: BigNumber;
  hash: string;
  inputs: Array<TransactionInput>;
  outputs: Array<TransactionOutput>;
  timestamp?: Date;
  blockHeight?: number;
  metadata: Record<string, any>;
  certificate: {
    stakeRegistrations: Array<unknown>;
    stakeDeRegistrations: Array<unknown>;
    stakeDelegations: Array<unknown>;
    poolRegistrations: Array<unknown>;
    poolDeRegistrations: Array<unknown>;
    instantRewards: Array<unknown>;
    genesisDelegations: Array<unknown>;
  };
  withdrawals?: Array<{
    stakeCredential: { type: string; key: string };
    amount: BigNumber;
  }>;
};

type TransactionObjectRaw = {
  fees: string;
  hash: string;
  inputs: Array<TransactionInputRaw>;
  outputs: Array<TransactionOutputRaw>;
  timestamp?: string;
  blockHeight?: number;
  metadata: Record<string, any>;
  certificate: {
    stakeRegistrations: Array<unknown>;
    stakeDeRegistrations: Array<unknown>;
    stakeDelegations: Array<unknown>;
    poolRegistrations: Array<unknown>;
    poolDeRegistrations: Array<unknown>;
    instantRewards: Array<unknown>;
    genesisDelegations: Array<unknown>;
  };
  withdrawals?: Array<{
    stakeCredential: { type: string; key: string };
    amount: BigNumber;
  }>;
};

function toTransactionObject(payload: TransactionObjectRaw): TransactionObject {
  return {
    fees: new BigNumber(payload.fees as string),
    hash: payload.hash as string,
    inputs: payload.inputs.map((i) => ({
      ...i,
      amount: new BigNumber(i.value),
      tokens: (i.tokens || []).map((t) => ({
        ...t,
        amount: new BigNumber(t.value),
      })),
    })),
    outputs: payload.outputs.map((o) => ({
      ...o,
      amount: new BigNumber(o.value),
      tokens: (o.tokens || []).map((t) => ({
        ...t,
        amount: new BigNumber(t.value),
      })),
    })),
    timestamp: payload.timestamp ? new Date(payload.timestamp) : undefined,
    blockHeight: payload.blockHeight
      ? (payload.blockHeight as number)
      : undefined,
    metadata: payload.metadata,
    certificate: payload.certificate as any,
    withdrawals: payload.withdrawals as Array<any>,
  };
}

export async function submitTransaction(
  id: string,
  transaction: string
): Promise<TransactionObject> {
  const res = await axios.post("/v1/transaction/submit", {
    id,
    transaction,
  });
  return toTransactionObject(res.data.transaction);
}
