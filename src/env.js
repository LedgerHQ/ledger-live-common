// @flow
// set and get environment & config variables
import { Subject } from "rxjs";

const intParser = (v: mixed): ?number => {
  if (!Number.isNaN(v)) return parseInt(v, 10);
};

const floatParser = (v: mixed): ?number => {
  if (!Number.isNaN(v)) return parseFloat(v);
};

const boolParser = (v: mixed): ?boolean => {
  if (typeof v === "boolean") return v;
  return !(v === "0" || v === "false");
};

const stringParser = (v: mixed): ?string =>
  typeof v === "string" ? v : undefined;

// This define the available environments
const envParsers = {
  USER_ID: stringParser,
  BASE_SOCKET_URL: stringParser,
  DEVICE_PROXY_URL: stringParser,
  DISABLE_TRANSACTION_BROADCAST: boolParser,
  EXPERIMENTAL_BLE: boolParser,
  EXPERIMENTAL_EXPLORERS: boolParser,
  EXPERIMENTAL_LANGUAGES: boolParser,
  EXPERIMENTAL_LIBCORE: boolParser,
  EXPERIMENTAL_SEND_MAX: boolParser,
  EXPERIMENTAL_ROI_CALCULATION: boolParser,
  EXPERIMENTAL_USB: boolParser,
  EXPLORER: stringParser,
  FORCE_PROVIDER: intParser,
  HIDE_EMPTY_TOKEN_ACCOUNTS: boolParser,
  KEYCHAIN_OBSERVABLE_RANGE: intParser,
  LEDGER_REST_API_BASE: stringParser,
  LIBCORE_PASSWORD: stringParser,
  MANAGER_API_BASE: stringParser,
  MANAGER_DEV_MODE: boolParser,
  MOCK: boolParser,
  SCAN_FOR_INVALID_PATHS: boolParser,
  SHOW_LEGACY_NEW_ACCOUNT: boolParser,
  SYNC_MAX_CONCURRENT: intParser,
  WITH_DEVICE_POLLING_DELAY: floatParser
};

// This define the default values
const defaults: $ObjMap<EnvParsers, ExtractEnvValue> = {
  USER_ID: "",
  BASE_SOCKET_URL: "wss://api.ledgerwallet.com/update",
  DEVICE_PROXY_URL: "",
  DISABLE_TRANSACTION_BROADCAST: false,
  EXPERIMENTAL_BLE: false,
  EXPERIMENTAL_EXPLORERS: false,
  EXPERIMENTAL_LANGUAGES: false,
  EXPERIMENTAL_LIBCORE: false,
  EXPERIMENTAL_SEND_MAX: false,
  EXPERIMENTAL_USB: false,
  EXPERIMENTAL_ROI_CALCULATION: false,
  EXPLORER: "https://explorers.api.live.ledger.com",
  FORCE_PROVIDER: 1,
  HIDE_EMPTY_TOKEN_ACCOUNTS: false,
  KEYCHAIN_OBSERVABLE_RANGE: 0,
  LEDGER_REST_API_BASE: "https://explorers.api.live.ledger.com",
  LIBCORE_PASSWORD: "",
  MANAGER_API_BASE: "https://manager.api.live.ledger.com/api",
  MANAGER_DEV_MODE: false,
  MOCK: false,
  SCAN_FOR_INVALID_PATHS: false,
  SHOW_LEGACY_NEW_ACCOUNT: false,
  SYNC_MAX_CONCURRENT: 4,
  WITH_DEVICE_POLLING_DELAY: 500
};

// private local state
const env: $ObjMap<EnvParsers, ExtractEnvValue> = {
  ...defaults
};

export const getAllEnvNames = (): EnvName[] => Object.keys(env);

export const getAllEnvs = (): Env => ({ ...env });

// Usage: you must use getEnv at runtime because the env might be settled over time. typically will allow us to dynamically change them on the interface (e.g. some sort of experimental flags system)
export const getEnv = <Name: EnvName>(name: Name): EnvValue<Name> =>
  // $FlowFixMe flow don't seem to type proof it
  env[name];

export const getEnvDefault = <Name: EnvName>(name: Name): EnvValue<Name> =>
  // $FlowFixMe flow don't seem to type proof it
  defaults[name];

export const isEnvDefault = <Name: EnvName>(name: Name): EnvValue<Name> =>
  // $FlowFixMe flow don't seem to type proof it
  env[name] === defaults[name];

export const changes: Subject<{
  name: EnvName,
  value: EnvValue<*>,
  oldValue: EnvValue<*>
}> = new Subject();

// change one environment
export const setEnv = <Name: EnvName>(name: Name, value: EnvValue<Name>) => {
  const oldValue = env[name];
  if (oldValue !== value) {
    // $FlowFixMe flow don't seem to type proof it
    env[name] = value;
    // $FlowFixMe
    changes.next({ name, value, oldValue });
  }
};

// change one environment with safety. returns true if it succeed
export const setEnvUnsafe = (name: string, unsafeValue: mixed): boolean => {
  if (!(name in envParsers)) return false;
  const parser = envParsers[name];
  const value = parser(unsafeValue);
  if (value === undefined || value === null) {
    console.warn(`Invalid ENV value for ${name}`);
    return false;
  }
  // $FlowFixMe flow don't seem to type proof it
  setEnv(name, value);
  return true;
};

type ExtractEnvValue = <V>((mixed) => ?V) => V;
type EnvParsers = typeof envParsers;
type Env = typeof env;
export type EnvValue<Name> = $ElementType<Env, Name>;
export type EnvName = $Keys<EnvParsers>;



