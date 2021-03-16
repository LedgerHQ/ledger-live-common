// @flow

import { log } from "@ledgerhq/logs";

export const delay = (ms: number): Promise<void> =>
  new Promise((f) => setTimeout(f, ms));

const defaults = {
  maxRetry: 4,
  interval: 300,
  intervalMultiplicator: 1.5,
  context: "",
};
export function retry<A>(
  f: () => Promise<A>,
  options?: $Shape<typeof defaults>
): Promise<A> {
  const { maxRetry, interval, intervalMultiplicator, context } = {
    ...defaults,
    ...options,
  };

  function rec(remainingTry, i) {
    const result = f();
    if (remainingTry <= 0) {
      return result;
    }
    // In case of failure, wait the interval, retry the action
    return result.catch((e) => {
      log(
        "promise-retry",
        context + " failed. " + remainingTry + " retry remain. " + String(e)
      );
      return delay(i).then(() =>
        rec(remainingTry - 1, i * intervalMultiplicator)
      );
    });
  }

  return rec(maxRetry, interval);
}

type Job<R, A> = (...args: A) => Promise<R>;

export const atomicQueue = <R, A: Array<*>>(
  job: Job<R, A>,
  queueIdentifier: (...args: A) => string = () => ""
): Job<R, A> => {
  const queues = {};
  return (...args) => {
    const id = queueIdentifier(...args);
    const queue = queues[id] || Promise.resolve();
    const p = queue.then(() => job(...args));
    queues[id] = p.catch(() => {});
    return p;
  };
};

export function execAndWaitAtLeast<A>(
  ms: number,
  cb: () => Promise<A>
): Promise<A> {
  const startTime = Date.now();
  return cb().then((r) => {
    const remaining = ms - (Date.now() - startTime);
    if (remaining <= 0) return r;
    return delay(remaining).then(() => r);
  });
}

/**
 * promiseAllBatched(n, items, i => f(i))
 * is essentially like
 * Promise.all(items.map(i => f(i)))
 * but with a guarantee that it will not create more than n concurrent call to f
 * where f is a function that returns a promise
 */
export async function promiseAllBatched<A, B>(
  batch: number,
  items: Array<A>,
  fn: (A, number) => Promise<B>
): Promise<B[]> {
  const data = Array(items.length);
  const queue = items.map((item, index) => ({ item, index }));

  async function step() {
    if (queue.length === 0) return;
    const { item, index } = queue.shift();
    data[index] = await fn(item, index);
    await step(); // each time an item redeem, we schedule another one
  }

  // initially, we schedule <batch> items in parallel
  await Promise.all(Array(Math.min(batch, items.length)).fill().map(step));

  return data;
}
