import type { SignedOperation } from "../types";

export type {
  Account as PlatformAccount,
  Currency as PlatformCurrency,
  Unit as PlatformUnit,
  Transaction as PlatformTransaction,
} from "@ledgerhq/live-app-sdk";

export type TranslatableString = {
  en: string;
  [locale: string]: string;
};

export type AppPlatform =
  | "desktop" // == windows || mac || linux
  | "mobile" // == android || ios
  | "all";

export type AppBranch = "stable" | "experimental" | "soon" | "debug";

export type AppPermission = {
  method: string;
  params?: any;
};

export type AppManifest = {
  id: string;
  private?: boolean;
  name: string;
  url: string;
  homepageUrl: string;
  supportUrl?: string;
  icon?: string | null;
  platform: AppPlatform;
  apiVersion: string;
  manifestVersion: string;
  branch: AppBranch;
  params?: any;
  categories: string[];
  currencies: string[] | "*";
  content: {
    shortDescription: TranslatableString;
    description: TranslatableString;
  };
  permissions: AppPermission[];
  domains: string[];
};

const categories = [
  "trade",
  "earn",
  "spend",
  "nft",
  "services",
  "other",
] as const;
/** Weird way of declaring this type but we actually want to loop on the array in data validation scripts  */
type Category = typeof categories[number];

type Tag =
  | "buy"
  | "card"
  | "dex"
  | "exchange"
  | "gift card"
  | "lend"
  | "nft"
  | "portfolio"
  | "stake"
  | "swap"
  | "tools";

type AppMetadata = {
  /**
   * Identifier of the Live App.
   * Should match the id in platform/apps/v1/data.json
   */
  id: string;

  /**
   * Tags.
   */
  tags: Tag[];

  /**
   * Categories.
   */
  categories: Category[];

  /**
   * Compatible platform.
   */
  platform: AppPlatform;

  /**
   * Branch.
   */
  branch: AppBranch;

  /**
   * Currencies.
   */
  currencies: string[] | "*";

  /**
   * Content (description, short description)
   */
  content: {
    shortDescription: TranslatableString;
    description: TranslatableString;
  };
};

type PromotedApp = {
  /** Should match the id in /platform/apps/v1/data.json */
  id: string;
  /**
   * Should match an image in /icons/platform/thumbnails/
   * https://www.figma.com/file/mT7CJQEuwoTAJvlZLfzgkL/?node-id=2709%3A18285
   * */
  thumbnailUrl: string;
  /**
   * Description to display as an overlay of the thumbnail
   * https://www.figma.com/file/mT7CJQEuwoTAJvlZLfzgkL/?node-id=2709%3A18285
   * */
  description: {
    en: string;
    [locale: string]: string;
  };
};

/**
 * Typing for ./data.json
 */
export type CatalogMetadata = {
  /**
   * Arbitrarily ordered list of existing categories.
   * Defines the default order in which to display categories in Ledger Live.
   */
  orderedCategories: Category[];
  /**
   * Sorted array of the promoted apps.
   * The first app in the array will be the first of the promoted apps displayed
   * in Ledger Live and the rest will follow in that order.
   */
  promotedApps: PromotedApp[];
  /**
   * Metadata for the catalog (data for filters etc.)
   */
  appsMetadata: AppMetadata[];
};

export type PlatformApi = {
  fetchManifest: () => Promise<AppManifest[]>;
  fetchCatalog: () => Promise<CatalogMetadata>;
};

export type PlatformSignedTransaction = SignedOperation;
