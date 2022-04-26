import { Cluster, clusterApiUrl } from "@solana/web3.js";
import { getEnv } from "../../env";

export const LEDGER_VALIDATOR_ADDRESS =
  "26pV97Ce83ZQ6Kz9XT4td8tdoUFPTng8Fb8gPyc53dJx";

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

export async function drainSeq<T>(jobs: (() => Promise<T>)[]) {
  const items: T[] = [];
  for (const job of jobs) {
    items.push(await job());
  }
  return items;
}

export function endpointByCurrencyId(currencyId: string): string {
  const endpoints: Record<string, string> = {
    solana: getEnv("API_SOLANA_PROXY"),
    solana_devnet: clusterApiUrl("devnet"),
    solana_testnet: clusterApiUrl("testnet"),
  };

  if (currencyId in endpoints) {
    return endpoints[currencyId];
  }

  throw Error(
    `unexpected currency id format <${currencyId}>, should be like solana[_(testnet | devnet)]`
  );
}

export function clusterByCurrencyId(currencyId: string): Cluster {
  const clusters: Record<string, Cluster> = {
    solana: "mainnet-beta",
    solana_devnet: "devnet",
    solana_testnet: "testnet",
  };

  if (currencyId in clusters) {
    return clusters[currencyId];
  }

  throw Error(
    `unexpected currency id format <${currencyId}>, should be like solana[_(testnet | devnet)]`
  );
}

export function defaultVoteAccAddrByCurrencyId(
  currencyId: string
): string | undefined {
  const voteAccAddrs: Record<string, string | undefined> = {
    solana: LEDGER_VALIDATOR_ADDRESS,
    solana_devnet: undefined,
    solana_testnet: undefined,
  };

  if (currencyId in voteAccAddrs) {
    return voteAccAddrs[currencyId];
  }

  throw new Error(
    `unexpected currency id format <${currencyId}>, should be like solana[_(testnet | devnet)]`
  );
}

type AsyncQueueEntry<T> = {
  lazyPromise: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
};

export function asyncQueue(config: { delayBetweenRuns: number }): {
  submit: <T>(fn: () => Promise<T>) => Promise<T>;
} {
  const { delayBetweenRuns } = config;
  const q: AsyncQueueEntry<any>[] = [];

  const drain = async () => {
    if (q.length > 0) {
      const { lazyPromise, resolve, reject } = q[q.length - 1];
      try {
        resolve(await lazyPromise());
      } catch (e) {
        reject(e);
      } finally {
        void setTimeout(() => {
          q.pop();
          void drain();
        }, delayBetweenRuns);
      }
    }
  };

  const submit = <T>(lazyPromise: () => Promise<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
      q.unshift({
        lazyPromise,
        resolve,
        reject,
      });

      if (q.length === 1) {
        void drain();
      }
    });
  };

  return {
    submit,
  };
}

export function swap(arr: any[], i: number, j: number) {
  const tmp = arr[i];
  arr[i] = arr[j];
  arr[j] = tmp;
}

export type Functions<T> = keyof {
  [K in keyof T as T[K] extends Function ? K : never]: T[K];
};
