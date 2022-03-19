import network from "../../../network";
import { CARDANO_API_ENDPOINT } from "../constants";
import { Account } from "../../../types";
import { APINetworkInfo } from "./api-types";
import { getEpoch } from "../logic";

async function fetchNetworkInfo(): Promise<APINetworkInfo> {
  const res = await network({
    method: "GET",
    url: `${CARDANO_API_ENDPOINT}/v1/network/info`,
  });
  return res && (res.data as APINetworkInfo);
}

export async function getNetworkInfo(
  a: Account | undefined
): Promise<APINetworkInfo> {
  if (a && a.cardanoResources) {
    // TODO: remove fix currencyId cardano_testnet
    // const currencyId = a.currency.id;
    const currencyId = "cardano_testnet";
    const currentEpoch = getEpoch(currencyId, new Date());
    const lastSyncedEpoch = getEpoch(currencyId, a.lastSyncDate);

    if (currentEpoch === lastSyncedEpoch) {
      return {
        protocolParams: a.cardanoResources.protocolParams,
      };
    }
  }
  return fetchNetworkInfo();
}
