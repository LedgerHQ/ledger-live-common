import { newKit } from "@celo/contractkit";
import { getEnv } from "../../../env";

export const celoKit = () => {
  return newKit(getEnv("API_CELO_NODE"));
};
