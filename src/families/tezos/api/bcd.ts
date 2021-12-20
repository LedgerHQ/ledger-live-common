// @flow
import URL from "url";
import { getEnv } from "../../../env";
import network from "../../../network";

export type TokenBalance = any;

const api = {
  async getTokenBalances(
    account: string,
    query: {
      sort_by: string;
      size: number;
      offset: number;
    }
  ): Promise<TokenBalance[]> {
    const { data } = await network({
      method: "GET",
      url: URL.format({
        pathname: `${getEnv(
          "API_TEZOS_BETTER_CALL_DEV_API"
        )}/v1/account/mainnet/${account}/token_balances`,
        query,
      }),
    });
    return data.balances;
  },
};

export default api;
