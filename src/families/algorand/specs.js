// @flow
import expect from "expect";
import invariant from "invariant";
import type { Transaction } from "./types";
import { getCryptoCurrencyById, parseCurrencyUnit } from "../../currencies";
import { isAccountEmpty } from "../../account";
import { pickSiblings } from "../../bot/specs";
import type { AppSpec } from "../../bot/types";
import { BigNumber } from "bignumber.js";
import type { Account } from "../../types";
import sample from "lodash/sample";
import { listTokensForCryptoCurrency } from "../../currencies";

const currency = getCryptoCurrencyById("algorand");

// Minimum fees
const minFees = parseCurrencyUnit(currency.units[0], "0.001");

// Minimum balance required for a new non-ASA account
const minBalanceNewAccount = parseCurrencyUnit(currency.units[0], "0.1");

// Spendable balance for a non-ASA account
const getSpendableBalance = (maxSpendable) => {
  maxSpendable = maxSpendable.minus(minFees);
  invariant(maxSpendable.gt(minFees), "spendable balance is too low");
  return maxSpendable;
};

// Ensure that, when the recipient corresponds to an empty account,
// the amount to send is greater or equal to the required minimum
// balance for such a recipient
const checkSendableToEmptyAccount = (amount, recipient) => {
  if (isAccountEmpty(recipient) && amount.lte(minBalanceNewAccount)) {
    invariant(
      amount.gt(minBalanceNewAccount),
      "not enough funds to send to new account"
    );
  }
};

// Get list of ASAs associated with the account
const getAssetsWithBalance = (account) => {
  return account.subAccounts
    ? account.subAccounts.filter(
        (a) => a.type === "TokenAccount" && a.balance.gt(0)
      )
    : [];
};

const pickSiblingsOptedIn = (siblings: Account[], assetId: string) => {
  return sample(
    siblings.filter((a) => {
      return a.subAccounts?.some(
        (sa) => sa.type === "TokenAccount" && sa.token.id.endsWith(assetId)
      );
    })
  );
};

// TODO: rework to perform _difference_ between
// array of valid ASAs and array of ASAs currently
// being opted-in by an account
const getRandomAssetId = (account) => {
  const optedInASA = account.subAccounts?.reduce((old, current) => {
    if (current.type === "TokenAccount") {
      return [...old, current.token.id];
    }
    return old;
  }, []);
  const ASAs = listTokensForCryptoCurrency(account.currency).map(
    (asa) => asa.id
  );
  const diff = ASAs?.filter((asa) => !optedInASA?.includes(asa));

  invariant(diff && diff.length > 0, "already got all optin");

  return sample(diff);
};

const algorand: AppSpec<Transaction> = {
  name: "Algorand",
  currency,
  appQuery: {
    model: "nanoS",
    appName: "Algorand",
  },
  mutations: [
    {
      name: "move ~50%",
      maxRun: 2,
      transaction: ({ account, siblings, bridge, maxSpendable }) => {
        const spendableBalance = getSpendableBalance(maxSpendable);

        const sibling = pickSiblings(siblings, 4);
        const recipient = sibling.freshAddress;

        let transaction = bridge.createTransaction(account);

        let amount = spendableBalance
          .div(1.9 + 0.2 * Math.random())
          .integerValue();

        checkSendableToEmptyAccount(amount, sibling);

        const updates = [{ amount }, { recipient }];
        return {
          transaction,
          updates,
        };
      },
      test: ({ account, accountBeforeTransaction, operation }) => {
        expect(account.balance.toString()).toBe(
          accountBeforeTransaction.balance.minus(operation.value).toString()
        );
      },
    },
    {
      name: "send max",
      maxRun: 1,
      transaction: ({ account, siblings, bridge, maxSpendable }) => {
        const spendableBalance = getSpendableBalance(maxSpendable);
        const sibling = pickSiblings(siblings, 4);

        // Send the full spendable balance
        const amount = spendableBalance;

        checkSendableToEmptyAccount(amount, sibling);

        return {
          transaction: bridge.createTransaction(account),
          updates: [
            {
              recipient: sibling.freshAddress,
            },
            { useAllAmount: true },
          ],
        };
      },
      test: ({ account }) => {
        // Ensure that there is no more than 20 μALGOs (discretionary value)
        // between the actual balance and the expected one to take into account
        // the eventual pending rewards added _after_ the transaction
        expect(account.spendableBalance.lt(20)).toBe(true);
      },
    },
    {
      name: "send ASA ~50%",
      maxRun: 2,
      transaction: ({ account, siblings, bridge, maxSpendable }) => {
        invariant(maxSpendable.gt(minFees), "not enough balance");
        const subAccount = sample(getAssetsWithBalance(account));

        invariant(
          subAccount && subAccount.type === "TokenAccount",
          "no subAccount with ASA"
        );

        const assetId = subAccount.token.id;
        const sibling = pickSiblingsOptedIn(siblings, assetId);

        let transaction = bridge.createTransaction(account);
        const recipient = sibling.freshAddress;

        const mode = "send";

        const amount = subAccount.balance
          .div(1.9 + 0.2 * Math.random())
          .integerValue();

        const updates = [
          { mode, subAccountId: subAccount.id },
          { recipient },
          { amount },
        ];
        return {
          transaction,
          updates,
        };
      },
      test: ({ account, accountBeforeTransaction, transaction, status }) => {
        const subAccountId = transaction.subAccountId;

        const subAccount = account.subAccounts?.find(
          (sa) => sa.id === subAccountId
        );
        const subAccountBeforeTransaction = accountBeforeTransaction.subAccounts?.find(
          (sa) => sa.id === subAccountId
        );
        expect(subAccount?.balance.toString()).toBe(
          subAccountBeforeTransaction?.balance.minus(status.amount).toString()
        );
      },
    },
    {
      name: "opt-In ASA available",
      maxRun: 1,
      transaction: ({ account, bridge, maxSpendable }) => {
        // maxSpendable is expected to be greater than 100,000 micro-Algos (+ 1,000 for fees)
        // corresponding to the requirement that the main account will have
        // one more ASA after the opt-in; its minimum balance is updated accordingly
        invariant(maxSpendable.gt(BigNumber(101000)), "balance is too low");

        let transaction = bridge.createTransaction(account);
        const mode = "optIn";

        const assetId = getRandomAssetId(account);

        const subAccount = account.subAccounts
          ? account.subAccounts.find((a) => a.id.includes(assetId))
          : null;
        invariant(!subAccount, "already opt-in");

        const updates = [{ mode }, { assetId }];
        return {
          transaction,
          updates,
        };
      },
      // eslint-disable-next-line no-unused-vars
      test: ({ account, transaction }) => {
        expect(
          account.subAccounts &&
            account.subAccounts.some((a) =>
              a.id.endsWith(transaction.assetId || "fail")
            )
        ).toBe(true);
      },
    },
    {
      name: "claim rewards",
      maxRun: 1,
      transaction: ({ account, bridge }) => {
        const rewards = account.algorandResources?.rewards;
        invariant(rewards && rewards.gt(0), "No pending rewards");

        let transaction = bridge.createTransaction(account);

        const mode = "claimReward";

        const updates = [{ mode }];
        return {
          transaction,
          updates,
        };
      },
      test: ({ account }) => {
        expect(
          account.algorandResources && account.algorandResources.rewards.eq(0)
        ).toBe(true);
      },
    },
  ],
};

export default { algorand };
