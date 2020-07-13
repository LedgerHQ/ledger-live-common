// @flow
import { log } from "@ledgerhq/logs";
import invariant from "invariant";
import { Subject, Observable } from "rxjs";
import { map, distinctUntilChanged } from "rxjs/operators";
import type { Core } from "./types";

const GC_DELAY = 1000;

let core: ?Core;
let corePromise: ?Promise<Core>;
let libcoreJobsCounter = 0;
let lastFlush: Promise<void> = Promise.resolve();
let flushTimeout = null;
const libcoreJobsCounterSubject: Subject<number> = new Subject();
export const libcoreJobBusy: Observable<boolean> = libcoreJobsCounterSubject.pipe(
  map((v) => v > 0),
  distinctUntilChanged()
);

type AfterGCJob<R> = {
  job: (Core) => Promise<R>,
  resolve: (R) => void,
};
const afterLibcoreFlushes: Array<AfterGCJob<any>> = [];

function flush(c: Core) {
  log("libcore/access", "flush");
  lastFlush = c
    .flush()
    .then(async () => {
      let item;
      while ((item = afterLibcoreFlushes.shift())) {
        item.resolve(await item.job(c));
      }
      log("libcore/access", "flush end");
    })
    .catch((e) => {
      log("libcore/access", "flush error " + String(e));
      console.error(e);
    });
}

export async function afterLibcoreGC<R>(
  job: (core: Core) => Promise<R>
): Promise<R> {
  return new Promise((resolve) => {
    if (!core) return;
    log("libcore/access", "new after gc job");
    afterLibcoreFlushes.push({ job, resolve });
    if (libcoreJobsCounter === 0) {
      log("libcore/access", "after gc job exec now");
      clearTimeout(flushTimeout);
      flushTimeout = setTimeout(flush.bind(null, core), GC_DELAY);
    }
  });
}

export async function withLibcore<R>(
  job: (core: Core) => Promise<R>
): Promise<R> {
  libcoreJobsCounter++;
  libcoreJobsCounterSubject.next(libcoreJobsCounter);
  let c: ?Core;
  try {
    if (flushTimeout) {
      // there is a new job so we must not do the GC yet.
      clearTimeout(flushTimeout);
      flushTimeout = null;
    }
    c = await load();
    await lastFlush; // wait previous flush before starting anything
    const res = await job(c);
    return res;
  } finally {
    libcoreJobsCounter--;
    libcoreJobsCounterSubject.next(libcoreJobsCounter);
    if (c && libcoreJobsCounter === 0) {
      flushTimeout = setTimeout(flush.bind(null, c), GC_DELAY);
    }
  }
}

type Fn<A, R> = (...args: A) => Promise<R>;

export const withLibcoreF = <A: Array<any>, R>(
  job: (core: Core) => Fn<A, R>
): Fn<A, R> => (...args) => withLibcore((c) => job(c)(...args));

let loadCoreImpl: ?() => Promise<Core>;

// reset the libcore data
export async function reset() {
  log("libcore/access", "reset");
  if (!core) return;
  invariant(libcoreJobsCounter === 0, "some libcore jobs are still running");
  await core.getServices().freshResetAll();
  core = null;
  corePromise = null;
}

async function load(): Promise<Core> {
  if (core) {
    return core;
  }
  if (!corePromise) {
    if (!loadCoreImpl) {
      console.warn("loadCore implementation is missing");
      throw new Error("loadCoreImpl missing");
    }
    log("libcore/access", "load core impl");
    corePromise = loadCoreImpl();
  }
  core = await corePromise;
  return core;
}

export function setLoadCoreImplementation(loadCore: () => Promise<Core>) {
  loadCoreImpl = loadCore;
}
