import network from "../../../network";
import { CARDANO_API_ENDPOINT } from "../constants";
import { APITransaction } from "./api-types";

export async function submitTransaction({
  hash,
  transaction,
}: {
  hash: string;
  transaction: string;
}): Promise<APITransaction> {
  const res = await network({
    method: "POST",
    url: `${CARDANO_API_ENDPOINT}/v1/transaction/submit`,
    data: {
      id: hash,
      transaction: transaction,
    },
  });
  return res.data.transaction;
}
