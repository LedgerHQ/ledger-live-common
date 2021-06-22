// @flow

import semver from "semver";

import type { AppPlatform, AppBranch } from "./types";
import { PLATFORM_VERSION } from "./constants";

export function translateContent(content, locale = "en") {
  if (!content || typeof content !== "object") return content;

  return content[locale] || content.en;
}

export function isSupported(manifest: AppManifest) {
  return semver.satisfies(semver.coerce(PLATFORM_VERSION), manifest.apiVersion);
}

export function matchBranches(manifest: AppManifest, branches: AppBranch[]) {
  return branches.indexOf(manifest.branch) > -1;
}

export function matchPlatform(manifest: AppManifest, platform: AppPlatform) {
  return manifest.platform === "all" || manifest.platform === platform;
}
