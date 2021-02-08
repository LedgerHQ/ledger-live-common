// @flow
import type { Account, NetworkInfo } from "../../types";

// TODO: move to api

async function getAccountNetworkInfo(account : Account): Promise<NetworkInfo> {
  const baseReserve = await getBaseReserve(account);
  const baseFees = await getFeeStats(account);
  const fees = baseFees.modeAcceptedFee;

  return {
    family: "stellar",
    fees, // FIXME: is this syntax ok?
    baseReserve,  // FIXME: is this syntax ok?
  };
}

export default getAccountNetworkInfo;
