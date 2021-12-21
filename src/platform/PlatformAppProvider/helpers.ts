import type { AppManifest } from "../types";
import semver from "semver";
export type FilterParams = {
  branches?: string[];
  platform?: string;
  private?: boolean;
  version?: string;
};
import path from "path";
import { readFileSync } from "fs";

function matchVersion(filterParams: FilterParams, manifest: AppManifest) {
  return (
    !filterParams.version ||
    semver.satisfies(semver.coerce(filterParams.version), manifest.apiVersion)
  );
}

function matchBranches(filterParams: FilterParams, manifest: AppManifest) {
  return (
    !filterParams.branches || filterParams.branches.includes(manifest.branch)
  );
}

function matchPlatform(filterParams: FilterParams, manifest: AppManifest) {
  return (
    !filterParams.platform ||
    manifest.platform === "all" ||
    filterParams.platform === manifest.platform
  );
}

function matchPrivate(filterParams: FilterParams, manifest: AppManifest) {
  return filterParams.private === true || !(manifest.private === true);
}

export function filterPlatformApps(
  appManifests: AppManifest[],
  filterParams: FilterParams
): AppManifest[] {
  return appManifests.filter((appManifest: AppManifest) => {
    return (
      matchBranches(filterParams, appManifest) &&
      matchPlatform(filterParams, appManifest) &&
      matchPrivate(filterParams, appManifest) &&
      matchVersion(filterParams, appManifest)
    );
  });
}
export function mergeManifestLists(
  list1: AppManifest[],
  list2: AppManifest[]
): AppManifest[] {
  const newIds = new Set(list2.map((elem) => elem.id));
  return [...list1.filter((elem) => !newIds.has(elem.id)), ...list2];
}

export function getLocalManifest(fileName: any) {
  const filePath = path.resolve(fileName);
  console.info(filePath);
  let manifestMap;

  try {
    const data = readFileSync(filePath);
    console.info(data);
    const manifest = JSON.parse(data.toString());
    console.info(manifest);
    manifestMap = new Map(manifest);

    // Array.isArray(manifest)
    //  ? manifest.forEach(m => new Map(m))
    //  :
    // TODO: PLEASE HALP ME HANDLE SEVERAL Dapps at a time
  } catch (parseError) {
    console.info("readFile error:", parseError);
  }

  return manifestMap;
}
