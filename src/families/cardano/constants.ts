import { getEnv } from "../../env";

export const STAKING_ADDRESS_INDEX = 0;
export const TTL_GAP = 7200;

export const CARDANO_API_ENDPOINT = getEnv("CARDANO_API_ENDPOINT");

// TODO: below values should be conditional
// based on currencyId (cardano ot cardano_testnet)
export const CARDANO_NETWORK_ID = 0;
export const ADDRESS_PREFIX = "addr_test";
