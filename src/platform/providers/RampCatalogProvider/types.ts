export type Loadable<T> = {
  error: any | null;
  isLoading: boolean;
  value: T | null;
};

export interface GenericRampCatalogEntry {
  name: string;
  paymentProviders: string[];
  cryptoCurrencies: string[];
  fiatCurrencies: string[];
}

export interface RampLiveAppCatalogEntry extends GenericRampCatalogEntry {
  type: "LIVE_APP";
  appId: string;
}

export interface RampNativeCatalogEntry extends GenericRampCatalogEntry {
  type: "NATIVE";
  path: string;
}

export type RampCatalogEntry = RampLiveAppCatalogEntry | RampNativeCatalogEntry;

export type RampCatalog = {
  onRamp: RampCatalogEntry[];
  offRamp: RampCatalogEntry[];
};
