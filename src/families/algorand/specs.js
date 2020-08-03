// @flow
import expect from "expect";
import invariant from "invariant";
import type { Transaction } from "./types";
import { getCryptoCurrencyById, parseCurrencyUnit } from "../../currencies";
import { isAccountEmpty } from "../../account";
import { pickSiblings } from "../../bot/specs";
import type { AppSpec } from "../../bot/types";

import { extractTokenId } from "./tokens";

const currency = getCryptoCurrencyById("algorand");

// Minimum fees
const minFees = parseCurrencyUnit(currency.units[0], "0.001");

// Minimum balance required for a new non-ASA account
const minBalanceNewAccount = parseCurrencyUnit(currency.units[0], "0.1");

// Minimum balance for a non-ASA account
let getMinBalance = (account) => {
  const minBalance = parseCurrencyUnit(currency.units[0], "0.1");
  const numberOfTokens = account.subAccounts
    ? account.subAccounts.filter((a) => a.type === "TokenAccount").length
    : 0;
  return minBalance.multipliedBy(1 + numberOfTokens);
};

// Spendable balance for a non-ASA account
let getSpendableBalance = (maxSpendable) => {
  maxSpendable = maxSpendable.minus(minFees);
  invariant(maxSpendable.gt(0), "spendable balance is too low");
  return maxSpendable;
};

// Ensure that, when the recipient corresponds to an empty account,
// the amount to send is greater or equal to the required minimum
// balance for such a recipient
let checkSendableToEmptyAccount = (amount, recipient) => {
  if (isAccountEmpty(recipient) && amount.lte(minBalanceNewAccount)) {
    invariant(
      amount.gt(minBalanceNewAccount),
      "not enough funds to send to new account"
    );
  }
};

// Extract asset ID from asset-type subaccount
let extractAssetId = (subaccount) => {
  if (subaccount.type !== "TokenAccount") {
    return null;
  }

  return extractTokenId(subaccount.token) || null;
};

// Get list of ASAs associated with the account
let getAssets = (account) => {
  return account.subAccounts
    ? account.subAccounts.filter((a) => a.type === "TokenAccount")
    : [];
};

// Get list of ASAs IDs common between two accounts (intersection)
let getCommonAssetsIds = (senderAccount, recipientAccount) => {
  const senderAssetsIds = getAssets(senderAccount)
    .filter((a) => a.balance.gt(0))
    .map((a) => extractAssetId(a));

  const recipientAssetsIds = getAssets(recipientAccount).map((a) =>
    extractAssetId(a)
  );

  return senderAssetsIds.filter((assetId) =>
    recipientAssetsIds.includes(assetId)
  );
};

// Get Subaccount ID
// eslint-disable-next-line no-unused-vars
let getSubaccountId = (account, assetId) => {
  if (account.subAccounts == null) return null;

  account.subAccounts.forEach((subaccount) => {
    if (subaccount.id.endsWith(assetId)) {
      return subaccount.id; // e.g., libcore:1:algorand:fef9 . . . 4d7af:+algorand/asa/342836
    }
  });
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
        // Debug
        //console.log("ℹ - assets IDs")
        //console.log(getAssetsIds(account));
        //console.log("ℹ - non empty assets IDs");
        //console.log(getNonEmptyAssetsIds(account);

        // Ensure that the sender has ASAs to send
        // i.e., opted-in ASAs with positive balance
        const senderAssets = getAssets(account);

        invariant(senderAssets.length > 0, "no ASA to send");

        const sibling = pickSiblings(siblings, 4);

        const commonTokensIds = getCommonAssetsIds(account, sibling);

        // Ensure that the recipient has opted-in to the same ASA
        invariant(commonTokensIds.length > 0, "no common opted-in ASA");

        let transaction = bridge.createTransaction(account);

        //const recipient = sibling.freshAddress;

        //const mode = "send";

        // Select a random common ASA
        //const assetId = commonTokens[Math.floor(Math.random() * commonTokens.length)] || "";

        //const amount = BigNumber(0);

        //TODO: define amount of ASA to send

        const updates = [];
        //const updates = [{ mode }, { assetId }, { recipient }, { amount }];
        return {
          transaction,
          updates,
        };
      },
      // eslint-disable-next-line no-unused-vars
      test: ({ account, accountBeforeTransaction, operation, transaction }) => {
        // TODO: assertion
      },
    },
    /*
    {
       name: "opt-In USDt",
       maxRun: 2,
       transaction: ({ account, siblings, bridge, maxSpendable }) => {
         const minBalance = getMinBalance(account);

         invariant(maxSpendable .gt(0), "balance is too low");
         let transaction = bridge.createTransaction(account);
         const mode = "optIn";
         const assetId = "312769";

         console.log(transaction);
         invariant(!account.subAccounts?.find(a => a.id.includes("assetId")), "already opt-in");

         const updates = [{ mode }, { assetId }];
         return {
           transaction,
           updates,
         };
       },
       test: ({ account, accountBeforeTransaction, operation, transaction }) => {
         //expect(account.subAccounts?.find(a => a.id.includes(transaction.assetId || "fail"))).toBe(true);
       },
     },
     */
  ],
};

export default { algorand };
