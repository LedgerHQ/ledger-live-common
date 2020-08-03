// @flow
import expect from "expect";
import invariant from "invariant";
import type { Transaction } from "./types";
import { getCryptoCurrencyById, parseCurrencyUnit } from "../../currencies";
import { isAccountEmpty } from "../../account";
import { pickSiblings } from "../../bot/specs";
import type { AppSpec } from "../../bot/types";
import { BigNumber } from "bignumber.js";
import { extractTokenId } from "./tokens";

const currency = getCryptoCurrencyById("algorand");

// Minimum fees
const minFees = parseCurrencyUnit(currency.units[0], "0.001");

// Minimum balance required for a new non-ASA account
const minBalanceNewAccount = parseCurrencyUnit(currency.units[0], "0.1");

// Minimum balance for a non-ASA account
const getMinBalance = (account) => {
  const minBalance = parseCurrencyUnit(currency.units[0], "0.1");
  const numberOfTokens = account.subAccounts
    ? account.subAccounts.filter((a) => a.type === "TokenAccount").length
    : 0;
  return minBalance.multipliedBy(1 + numberOfTokens);
};

// Spendable balance for a non-ASA account
const getSpendableBalance = (maxSpendable) => {
  maxSpendable = maxSpendable.minus(minFees);
  invariant(maxSpendable.gt(0), "spendable balance is too low");
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
const getAssets = (account) => {
  return account.subAccounts
    ? account.subAccounts.filter((a) => a.type === "TokenAccount")
    : [];
};

// Get list of ASAs IDs common between two accounts (intersection)
const getCommonAssetsIds = (senderAccount, recipientAccount) => {
  const senderAssetsIds = getAssets(senderAccount)
    .filter((a) => a.balance.gt(0))
    .map((a) => extractTokenId(a.id));

  const recipientAssetsIds = getAssets(recipientAccount).map((a) =>
    extractTokenId(a.id)
  );

  return senderAssetsIds.filter((assetId) =>
    recipientAssetsIds.includes(assetId)
  );
};

const getSubAccountByAssetId = (account, assetId) => {
  return account.subAccounts
    ? account.subAccounts.find(
        (a) => a.type === "TokenAccount" && a.id.endsWith(assetId)
      )
    : null;
};

// TODO: rework to perform _difference_ between
// array of valid ASAs and array of ASAs currently
// being opted-in by an account
const getRandomAssetId = () => {
  const ASAs = [
    "438840",
    "438839",
    "438838",
    "438837",
    "438836",
    "438833",
    "438832",
    "438831",
    "438828",
    "312769",
    "163650",
  ];

  return "algorand/asa/" + ASAs[Math.floor(Math.random() * ASAs.length)];
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
              recipient: pickSiblings(siblings, 30).freshAddress,
            },
            { useAllAmount: true },
          ],
        };
      },
      test: ({ account }) => {
        const minBalance = getMinBalance(account);
        const actualBalance = account.balance;

        // Ensure that there is no more than 20 μALGOs (discretionary value)
        // between the actual balance and the expected one to take into account
        // the eventual pending rewards added _after_ the transaction
        expect(actualBalance.minus(minBalance).lt(20)).toBe(true);
      },
    },
    {
      name: "send ASA", // WIP
      maxRun: 2,
      transaction: ({ account, siblings, bridge }) => {
        // Ensure that the sender has ASAs to send
        // i.e., opted-in ASAs with positive balance
        invariant(
          getAssets(account).filter((a) => a.balance.gt(0)).length > 0,
          "no ASA to send"
        );

        const sibling = pickSiblings(siblings, 4);

        const commonTokensIds = getCommonAssetsIds(account, sibling);

        // Ensure that the recipient has opted-in to the same ASA
        invariant(commonTokensIds.length > 0, "no common opted-in ASA");

        let transaction = bridge.createTransaction(account);

        const recipient = sibling.freshAddress;

        const mode = "send";

        // Select a random common ASA
        const assetId =
          "algorand/asa/" +
          commonTokensIds[Math.floor(Math.random() * commonTokensIds.length)];

        const amount = getSubAccountByAssetId(account, assetId)?.balance;

        //TODO: define amount of ASA to send
        //  errors: amount: AmountRequired
        // ⚠️ AmountRequired: AmountRequired
        const updates = [{ mode, assetId }, { recipient }, { amount }];
        return {
          transaction,
          updates,
        };
      },
      // eslint-disable-next-line no-unused-vars
      test: ({ account, accountBeforeTransaction, operation, transaction }) => {
        // TODO: create assertion
      },
    },
    {
      name: "opt-In USDt",
      maxRun: 2,
      transaction: ({ account, bridge, maxSpendable }) => {
        // maxSpendable is expected to be greater than 100,000 micro-Algos (+ 1,000 for fees)
        // corresponding to the requirement that the main account will have
        // one more ASA after the opt-in; its minimum balance is updated accordingly
        invariant(maxSpendable.gt(BigNumber(101000)), "balance is too low");

        let transaction = bridge.createTransaction(account);
        const mode = "optIn";

        const assetId = getRandomAssetId();

        const subAccount = account.subAccounts
          ? account.subAccounts.find((a) => a.id.includes(assetId))
          : null;
        invariant(!subAccount, "already opt-in");

        const updates = [{ assetId }, { mode }];
        return {
          transaction,
          updates,
        };
      },
      // eslint-disable-next-line no-unused-vars
      test: ({ account, accountBeforeTransaction, operation, transaction }) => {
        expect(
          account.subAccounts &&
            account.subAccounts.some((a) =>
              a.id.endsWith(transaction.assetId || "fail")
            )
        ).toBe(true);
      },
    },
  ],
};

export default { algorand };
