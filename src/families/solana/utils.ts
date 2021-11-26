import { Cluster } from "@solana/web3.js";

export const assertUnreachable = (_: never): never => {
  throw new Error("unreachable assertion failed");
};

export async function drainSeqAsyncGen<T>(
  ...asyncGens: AsyncGenerator<T>[]
): Promise<T[]> {
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
  if (parts[0] === "solana") {
    if (parts.length === 1) {
      return "mainnet-beta";
    }
    if (parts.length === 2) {
      if (parts[1] === "devnet" || parts[1] === "testnet") {
        return parts[1];
      }
    }
  }

  throw Error(
    `unexpected currency id format <${currencyId}>, should be like solana[_(testnet | devnet)]`
  );
}

type AsyncQueueEntry<T> = {
  lazyPromise: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
};

async function drainAsyncQueue() {
  if (asyncQueue.length > 0) {
    const { lazyPromise, resolve, reject } = asyncQueue[asyncQueue.length - 1];
    try {
      resolve(await lazyPromise());
    } catch (e) {
      reject(e);
    } finally {
      asyncQueue.pop();
      drainAsyncQueue();
    }
  }
}

const asyncQueue: AsyncQueueEntry<any>[] = [];

export function runQueued<T>(lazyPromise: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    asyncQueue.unshift({
      lazyPromise,
      resolve,
      reject,
    });

    drainAsyncQueue();
  });
}

export const lazy = <ARGS extends any[], R>(fn: (...args: ARGS) => R) => {
  return (...args: ARGS) =>
    () =>
      fn(...args);
};
