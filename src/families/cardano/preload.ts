import { Observable, Subject } from "rxjs";
import { log } from "@ledgerhq/logs";

import type { CardanoPreloadData } from "./types";
import { getPreloadedData } from "./api";

const PRELOAD_MAX_AGE = 24 * 60 * 60 * 1000; // 1 day

let currentPreloadedData: CardanoPreloadData;

function fromHydratePreloadData(data: any): CardanoPreloadData {
  return data;
}

const updates = new Subject<CardanoPreloadData>();

export function getCurrentCardanoPreloadData(): CardanoPreloadData {
  return currentPreloadedData;
}

export function setCardanoPreloadData(data: CardanoPreloadData): void {
  if (data === currentPreloadedData) return; // TODO: check logic
  currentPreloadedData = data;
  updates.next(data);
}

export function getCardanoPreloadDataUpdates(): Observable<CardanoPreloadData> {
  return updates.asObservable();
}

export const getPreloadStrategy = (): { preloadMaxAge: number } => ({
  preloadMaxAge: PRELOAD_MAX_AGE,
});

export const preload = async (): Promise<CardanoPreloadData> => {
  log("cardano/preload", "preloading cardano data...");

  const cardanoPreloadedData = await getPreloadedData();

  return cardanoPreloadedData;
};

export const hydrate = (data: any): void => {
  const hydrated = fromHydratePreloadData(data);

  log("cardano/preload", `hydrated ${hydrated}`);

  setCardanoPreloadData(hydrated);
};
