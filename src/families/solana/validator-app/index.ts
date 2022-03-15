import { Cluster } from "@solana/web3.js";
import { AxiosRequestConfig, AxiosResponse } from "axios";
import network from "../../../network";

export type ValidatorAppValidator = {
  active_stake: number;
  commission: number;
  total_score: number;
  vote_account: string;
  name?: string | null;
  avatar_url?: string | null;
  delinquent?: boolean | null;

  // not used data
  /*
  network: string;
  account: string;
  keybase_id: string | null;
  www_url: string | null;
  details: string | null;
  created_at: Date;
  updated_at: Date;
  admin_warning: string | null;
  root_distance_score: number;
  vote_distance_score: number;
  skipped_slot_score: number;
  software_version: string;
  software_version_score: number;
  stake_concentration_score: number;
  data_center_concentration_score: number;
  published_information_score: number;
  security_report_score: number;
  data_center_key: string;
  data_center_host: string | null;
  authorized_withdrawer_score: number;
  autonomous_system_number: number;
  latitude: string;
  longitude: string;
  url: string;
  */
};

const URLS = {
  validatorList: (cluster: Exclude<Cluster, "devnet">) => {
    const clusterSlug = cluster === "mainnet-beta" ? "mainnet" : cluster;
    return `https://www.validators.app/api/v1/validators/${clusterSlug}.json?order=score`;
  },
};

export async function getValidators(
  cluster: Exclude<Cluster, "devnet">
): Promise<ValidatorAppValidator[]> {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: URLS.validatorList(cluster),
    headers: {
      Token: "3Y5dGxVc7JS9SktzH6JL2eZX",
    },
  };

  const response: AxiosResponse<ValidatorAppValidator[]> = await network(
    config
  );

  const allValidators = response.status === 200 ? response.data : [];

  // validators app data is not clean: random properties can randomly contain
  // data, null, undefined
  const isUsableValidator = (v: Partial<ValidatorAppValidator>) => {
    return (
      typeof v.active_stake === "number" &&
      typeof v.commission === "number" &&
      typeof v.total_score === "number" &&
      typeof v.vote_account === "string" &&
      v.delinquent !== true
    );
  };

  return allValidators.filter(isUsableValidator);
}
