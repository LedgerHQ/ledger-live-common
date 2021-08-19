// @flow
import type { TezosResources, TezosResourcesRaw } from "./types";

export function toTezosResourcesRaw(r: TezosResources): TezosResourcesRaw {
  const { revealed } = r;
  // FIXME this must be matching the type, otherwise it will break on LLD.
  return { revealed };
}

export function fromTezosResourcesRaw(r: TezosResourcesRaw): TezosResources {
  const { revealed } = r;
  return { revealed };
}
