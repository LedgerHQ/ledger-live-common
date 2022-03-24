/*
import { from } from "rxjs";
import { mergeAll } from "rxjs/operators";
import { flatMap } from "lodash";
*/
import { setup } from "./test-helpers/libcore-setup";
import { testBridge } from "./test-helpers/bridge";
import dataset from "../generated/test-dataset";
import specifics from "../generated/test-specifics";
import type { DatasetTest } from "../types";
import { disconnectAll } from "../api";
// Disconnect all api clients that could be open.
afterAll(async () => {
  await disconnectAll();
});
setup("libcore");

const families = Object.keys(dataset);
const maybeFamilyToOnlyRun =
  process.env.BRANCH && process.env.BRANCH.split("/")[0];
const shouldExcludeFamilies =
  maybeFamilyToOnlyRun && families.includes(maybeFamilyToOnlyRun);
// covers all bridges through many different accounts
// to test the common shared properties of bridges.
// const all =
families
  .map((family) => {
    if (process.env.FAMILY && process.env.FAMILY !== family) return;
    if (shouldExcludeFamilies && maybeFamilyToOnlyRun !== family) return;
    const data: DatasetTest<any> = dataset[family];
    return testBridge(family, data);
  })
  .filter(Boolean);
// FIXME overkill atm but could help perf

/*
const MAX_CONCURRENT = 2;
from(flatMap(all, r => r.preloadObservables))
  .pipe(mergeAll(MAX_CONCURRENT))
  .subscribe();
*/
Object.values(specifics).forEach((specific: (...args: Array<any>) => any) => {
  specific();
});
