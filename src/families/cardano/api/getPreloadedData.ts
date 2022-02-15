import { CardanoPreloadData } from "../types";
import axios from "./axios";

export async function getPreloadedData(): Promise<CardanoPreloadData> {
  const res = await axios.get("/v1/network/info");
  return res.data && (res.data as CardanoPreloadData);
}
