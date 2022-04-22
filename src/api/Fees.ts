import { FeeEstimationFailed } from "@ledgerhq/errors";
import invariant from "invariant";
import { makeLRUCache } from "../cache";
import network from "../network";
import type { CryptoCurrency } from "../types";
import { blockchainBaseURL } from "./Ledger";

export type Fees = Record<string, number>;

export const getEstimatedFees: (currency: CryptoCurrency) => Promise<Fees> =
  makeLRUCache(
    async (currency) => {
      const baseURL = blockchainBaseURL(currency);
      invariant(baseURL, `Fees for ${currency.id} are not supported`);
      const { data, statusCode } = await network({
        method: "GET",
        url: `${baseURL}/fees`,
      });

      if (data) {
        return data;
      }

      throw new FeeEstimationFailed(`FeeEstimationFailed ${statusCode}`, {
        httpStatus: statusCode,
      });
    },
    (c) => c.id
  );
