// @flow
import invariant from "invariant";
import type { CryptoCurrency, CryptoCurrencyConfig } from "./types";
import { getCryptoCurrencyById } from "./currencies";
import { getEnv } from "./env";

export type ModeSpec = {
  mandatoryEmptyAccountSkip?: number,
  isNonIterable?: boolean,
  overridesDerivation?: string,
  libcoreConfig?: { [_: string]: mixed },
  isSegwit?: boolean, // TODO drop
  isUnsplit?: boolean, // TODO drop
  skipFirst?: true,
  overridesCoinType?: number, // force a given cointype
  purpose?: number,
  isInvalid?: boolean, // invalid means it's not a path we ever supported. some users fall into this and we support scanning for them in SCAN_FOR_INVALID_PATHS is set.
  tag?: string,
  addressFormat?: string
};

export type DerivationMode = $Keys<typeof modes>;

const modes = Object.freeze({
  // this is "default" by convention
  "": {},

  stellar: {
    overridesDerivation: "44'/148'/<account>'",
    tag: "stellar"
  },
  // MEW legacy derivation
  ethM: {
    mandatoryEmptyAccountSkip: 10,
    overridesDerivation: "44'/60'/0'/<account>",
    tag: "legacy"
  },
  // MetaMask style
  ethMM: {
    overridesDerivation: "44'/60'/0'/0/<account>",
    skipFirst: true, // already included in the normal bip44,
    tag: "metamask"
  },
  // many users have wrongly sent BTC on BCH paths
  legacy_on_bch: {
    overridesCoinType: 145,
    isInvalid: true
  },
  // chrome app and LL wrongly used to derivate vertcoin on 128
  vertcoin_128: {
    tag: "legacy",
    overridesCoinType: 128
  },
  vertcoin_128_segwit: {
    tag: "legacy",
    overridesCoinType: 128,
    isSegwit: true,
    purpose: 49,
    libcoreConfig: {
      KEYCHAIN_ENGINE: "BIP49_P2SH"
    },
    addressFormat: "p2sh"
  },
  // MEW legacy derivation for eth
  etcM: {
    mandatoryEmptyAccountSkip: 10,
    overridesDerivation: "44'/60'/160720'/0'/<account>",
    tag: "legacy"
  },
  aeternity: {
    overridesDerivation: "<account>"
  },
  // default derivation of tezbox offerred to users
  tezbox: {
    tag: "tezbox",
    overridesDerivation: "44'/1729'/0'/0'",
    isNonIterable: true,
    libcoreConfig: {
      TEZOS_XPUB_CURVE: "SECP256K1" // FIXME bug in libcore? it should be ED25519
    }
  },
  tezosbip44h: {
    overridesDerivation: "44'/1729'/<account>'/0'/0'",
    libcoreConfig: {
      TEZOS_XPUB_CURVE: "SECP256K1" // FIXME bug in libcore? it should be ED25519
    }
  },
  native_segwit: {
    purpose: 84,
    libcoreConfig: {
      KEYCHAIN_ENGINE: "BIP173_P2WPKH"
    },
    addressFormat: "bech32",
    tag: "native segwit",
    isSegwit: true
  },
  segwit: {
    isSegwit: true,
    purpose: 49,
    libcoreConfig: {
      KEYCHAIN_ENGINE: "BIP49_P2SH"
    },
    tag: "segwit",
    addressFormat: "p2sh"
  },
  segwit_on_legacy: {
    isSegwit: true,
    purpose: 44,
    libcoreConfig: {
      KEYCHAIN_ENGINE: "BIP49_P2SH"
    },
    addressFormat: "p2sh",
    isInvalid: true
  },
  legacy_on_segwit: {
    purpose: 49,
    libcoreConfig: {
      KEYCHAIN_ENGINE: ""
    },
    isInvalid: true
  },
  segwit_unsplit: {
    isSegwit: true,
    purpose: 49,
    libcoreConfig: {
      KEYCHAIN_ENGINE: "BIP49_P2SH"
    },
    addressFormat: "p2sh",
    isUnsplit: true,
    tag: "segwit unsplit"
  },
  unsplit: {
    isUnsplit: true,
    tag: "unsplit"
  }
});

(modes: { [_: DerivationMode]: ModeSpec }); // eslint-disable-line

const legacyDerivations: $Shape<CryptoCurrencyConfig<DerivationMode[]>> = {
  aeternity: ["aeternity"],
  bitcoin: ["legacy_on_bch"],
  vertcoin: ["vertcoin_128", "vertcoin_128_segwit"],
  ethereum: ["ethM", "ethMM"],
  ethereum_classic: ["ethM", "etcM", "ethMM"],
  tezos: ["tezbox", "tezosbip44h"],
  stellar: ["stellar"]
};

export const asDerivationMode = (derivationMode: string): DerivationMode => {
  invariant(
    derivationMode in modes,
    "not a derivationMode. Got: '%s'",
    derivationMode
  );
  // $FlowFixMe flow limitation
  return derivationMode;
};

export const getAllDerivationModes = (): DerivationMode[] => Object.keys(modes);

export const getMandatoryEmptyAccountSkip = (
  derivationMode: DerivationMode
): number => modes[derivationMode].mandatoryEmptyAccountSkip || 0;

export const isInvalidDerivationMode = (
  derivationMode: DerivationMode
): boolean => modes[derivationMode].isInvalid || false;

export const isSegwitDerivationMode = (
  derivationMode: DerivationMode
): boolean => modes[derivationMode].isSegwit || false;

export const getLibcoreConfig = (
  derivationMode: DerivationMode
): ?{ [_: string]: mixed } => modes[derivationMode].libcoreConfig;

export const isUnsplitDerivationMode = (
  derivationMode: DerivationMode
): boolean => modes[derivationMode].isUnsplit || false;

export const isIterableDerivationMode = (
  derivationMode: DerivationMode
): boolean => !modes[derivationMode].isNonIterable;

export const getPurposeDerivationMode = (
  derivationMode: DerivationMode
): number => modes[derivationMode].purpose || 44;

export const getTagDerivationMode = (
  currency: CryptoCurrency,
  derivationMode: DerivationMode
): ?string => {
  const mode = modes[derivationMode];
  if (mode.tag) {
    return mode.tag;
  }
  if (mode.isInvalid) {
    return "custom";
  }
  if (currency.supportsSegwit && !isSegwitDerivationMode(derivationMode)) {
    return "legacy";
  }
  return null;
};

export const getAddressFormatDerivationMode = (
  derivationMode: DerivationMode
): string => modes[derivationMode].addressFormat || "legacy";

export const derivationModeSupportsIndex = (
  derivationMode: DerivationMode,
  index: number
): boolean => {
  const mode = modes[derivationMode];
  if (mode.skipFirst && index === 0) return false;
  return true;
};

const currencyForceCoinType = {
  vertcoin: true
};

/**
 * return a ledger-lib-core compatible DerivationScheme format
 * for a given currency and derivationMode (you can pass an Account because same shape)
 */
export const getDerivationScheme = ({
  derivationMode,
  currency
}: {
  derivationMode: DerivationMode,
  currency: CryptoCurrency
}): string => {
  const { overridesDerivation, overridesCoinType } = modes[derivationMode];
  if (overridesDerivation) return overridesDerivation;
  const splitFrom =
    isUnsplitDerivationMode(derivationMode) && currency.forkedFrom;
  const coinType = splitFrom
    ? getCryptoCurrencyById(splitFrom).coinType
    : overridesCoinType ||
      (currencyForceCoinType ? currency.coinType : "<coin_type>");
  const purpose = getPurposeDerivationMode(derivationMode);
  return `${purpose}'/${coinType}'/<account>'/<node>/<address>`;
};

// Execute a derivation scheme in JS side
export const runDerivationScheme = (
  derivationScheme: string,
  { coinType }: { coinType: number },
  opts: {
    account?: number,
    node?: number,
    address?: number
  } = {}
) =>
  derivationScheme
    .replace("<coin_type>", String(coinType))
    .replace("<account>", String(opts.account || 0))
    .replace("<node>", String(opts.node || 0))
    .replace("<address>", String(opts.address || 0));

const disableBIP44 = {
  aeternity: true,
  tezos: true // current workaround, device app does not seem to support bip44
};

const seedIdentifierPath = {
  neo: ({ purpose, coinType }) => `${purpose}'/${coinType}'/0'/0/0`,
  _: ({ purpose, coinType }) => `${purpose}'/${coinType}'`
};

export const getSeedIdentifierDerivation = (
  currency: CryptoCurrency,
  derivationMode: DerivationMode
): string => {
  const unsplitFork = isUnsplitDerivationMode(derivationMode)
    ? currency.forkedFrom
    : null;
  const purpose = getPurposeDerivationMode(derivationMode);
  const { coinType } = unsplitFork
    ? getCryptoCurrencyById(unsplitFork)
    : currency;
  const f = seedIdentifierPath[currency.id] || seedIdentifierPath._;
  return f({ purpose, coinType });
};

// return an array of ways to derivate, by convention the latest is the standard one.
export const getDerivationModesForCurrency = (
  currency: CryptoCurrency
): DerivationMode[] => {
  const all =
    currency.id in legacyDerivations
      ? legacyDerivations[currency.id].slice(0)
      : [];
  if (currency.forkedFrom) {
    all.push("unsplit");
    if (currency.supportsSegwit) {
      all.push("segwit_unsplit");
    }
  }
  if (currency.supportsSegwit) {
    all.push("segwit_on_legacy");
    all.push("legacy_on_segwit");
  }
  if (!disableBIP44[currency.id]) {
    all.push("");
  }
  if (currency.supportsSegwit) {
    all.push("segwit");
  }
  if (currency.supportsNativeSegwit) {
    all.push("native_segwit");
  }
  if (!getEnv("SCAN_FOR_INVALID_PATHS")) {
    return all.filter(a => !isInvalidDerivationMode(a));
  }
  return all;
};
