import { Cluster } from "@solana/web3.js";

export const assertUnreachable = (value: never) => {
  throw new Error("unreachable assertion failed");
};

export async function drainSeqAsyncGen<T>(...asyncGens: AsyncGenerator<T>[]) {
  const items: T[] = [];
  for (const gen of asyncGens) {
    for await (const item of gen) {
      items.push(item);
    }
  }
  return items;
}

export function clusterByCurrencyId(currencyId: string): Cluster {
  const parts = currencyId.split("_");
  if (parts.length !== 2 || parts[0] !== "solana") {
    throw Error(
      `unexpected currency id format <${currencyId}>, should be like "solana_testnet"`
    );
  }
  if (parts[1] === "devnet" || parts[1] === "testnet") {
    return parts[1];
  }

  return "mainnet-beta";
}
