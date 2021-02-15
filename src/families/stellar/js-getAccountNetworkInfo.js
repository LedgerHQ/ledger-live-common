// @flow
import { BigNumber } from "bignumber.js";
import type { Account, NetworkInfo } from "../../types";

// TODO: move the whole file to api

// Placeholder, TODO: implement in api
async function getBaseReserve(a: Account) {
  return 1;
}

// Placeholder, TODO: implement in api
async function getFeeStats(a: Account) {
  return { modeAcceptedFee: BigNumber(0.1) };
}

async function getAccountNetworkInfo(account: Account): Promise<NetworkInfo> {
  const baseReserve = await getBaseReserve(account);
  const baseFees = await getFeeStats(account);
  const fees = baseFees.modeAcceptedFee;

  return {
    family: "stellar",
    fees,
    baseReserve,
  };
}

export default getAccountNetworkInfo;
