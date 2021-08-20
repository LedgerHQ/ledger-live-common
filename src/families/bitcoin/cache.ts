import { RecipientRequired } from "@ledgerhq/errors";
import type { CacheRes } from "./../../cache";
import { makeLRUCache } from "./../../cache";
import type { Account, CryptoCurrency } from "./../../types";
import type { Transaction } from "./types";
import getFeesForTransaction from "./js-getFeesForTransaction";
import { isValidRecipient } from "./logic";

const getCacheKeyForCalculateFees = ({
  a,
  t,
}: {
  a: Account;
  t: Transaction;
}) =>
  `${a.id}_${a.blockHeight || 0}_${t.amount.toString()}_${String(
    t.useAllAmount
  )}_${t.recipient}_${t.feePerByte ? t.feePerByte.toString() : ""}_${
    t.utxoStrategy.pickUnconfirmedRBF ? 1 : 0
  }_${t.utxoStrategy.strategy}_${String(t.rbf)}_${t.utxoStrategy.excludeUTXOs
    .map(({ hash, outputIndex }) => `${hash}@${outputIndex}`)
    .join("+")}`;

export const calculateFees = makeLRUCache(
  async ({ account, transaction }) =>
    getFeesForTransaction({
      account,
      transaction,
    }),
  ({ account, transaction }) =>
    getCacheKeyForCalculateFees({
      a: account,
      t: transaction,
    }),
  {
    maxAge: 5 * 60 * 1000, // 5 minutes
  }
);
export const validateRecipient: CacheRes<
  Array<{
    currency: CryptoCurrency;
    recipient: string;
  }>,
  {
    recipientError: Error | null | undefined;
    recipientWarning: Error | null | undefined;
  }
> = makeLRUCache(
  async ({
    currency,
    recipient,
  }): Promise<{
    recipientError: Error | null | undefined;
    recipientWarning: Error | null | undefined;
  }> => {
    if (!recipient) {
      return {
        recipientError: new RecipientRequired(""),
        recipientWarning: null,
      };
    }

    try {
      const recipientWarning = await isValidRecipient({
        currency,
        recipient,
      });
      return {
        recipientError: null,
        recipientWarning,
      };
    } catch (recipientError) {
      return {
        recipientError,
        recipientWarning: null,
      };
    }
  },
  ({ currency, recipient }) => `${currency.id}_${recipient || ""}`,
  {
    maxAge: 5 * 60 * 1000, // 5 minutes
  }
);
