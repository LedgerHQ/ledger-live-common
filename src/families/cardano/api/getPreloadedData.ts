import { CardanoPreloadData } from "../types";
import network from "../../../network";
import { CARDANO_API_ENDPOINT } from "../constants";

export async function getPreloadedData(): Promise<CardanoPreloadData> {
  const res = await network({
    method: "GET",
    url: `${CARDANO_API_ENDPOINT}/v1/network/info`,
  });
  return res.data && (res.data as CardanoPreloadData);
}
