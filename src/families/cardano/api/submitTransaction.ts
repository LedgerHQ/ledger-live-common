import { CryptoCurrency } from "@ledgerhq/cryptoassets";
import network from "../../../network";
import {
  CARDANO_API_ENDPOINT,
  CARDANO_TESTNET_API_ENDPOINT,
} from "../constants";
import { isTestnet } from "../logic";
import { APITransaction } from "./api-types";

export async function submitTransaction({
  hash,
  transaction,
  currency,
}: {
  hash: string;
  transaction: string;
  currency: CryptoCurrency;
}): Promise<APITransaction> {
  const res = await network({
    method: "POST",
    url: isTestnet(currency)
      ? `${CARDANO_TESTNET_API_ENDPOINT}/v1/transaction/submit`
      : `${CARDANO_API_ENDPOINT}/v1/transaction/submit`,
    data: {
      id: hash,
      transaction: transaction,
    },
  });
  return res.data.transaction;
}
