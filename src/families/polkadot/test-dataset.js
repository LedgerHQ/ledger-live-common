// @flow

import { BigNumber } from "bignumber.js";
import {
  NotEnoughBalance,
  RecipientRequired,
  InvalidAddress,
  InvalidAddressBecauseDestinationIsAlsoSource,
  AmountRequired,
  NotEnoughBalanceBecauseDestinationNotCreated,
} from "@ledgerhq/errors";

import {
  PolkadotUnauthorizedOperation,
  PolkadotNotValidator,
  PolkadotBondMinimumAmount,
  PolkadotValidatorsRequired,
} from "./errors";

import type { DatasetTest } from "../../types";
import { fromTransactionRaw } from "./transaction";
import type { Transaction } from "./types";

// const ACCOUNT_SAME_STASHCONTROLLER = "12JHbw1vnXxqsD6U5yA3u9Kqvp9A7Zi3qM2rhAreZqP5zUmS";
const ACCOUNT_STASH = "13SGsuG6S1SeLfenuSauQMCzctr3z9SNKr8gbnXsEtyYijkT";
const ACCOUNT_CONTROLLER = "15FwDL7TkRJFyGK9o6iYiqjFM1Mrq6VXXvdFQ9a7m5TQayUY";
const ACCOUNT_EMPTY = "111111111111111111111111111111111HC1";
const ACCOUNT_WITH_NO_OPERATION =
  "1jJ2WTbK7LbgjdkJSB5tLvPQM6GKZGZjjBzoK4pjn1RQ6Di";

const dataset: DatasetTest<Transaction> = {
  implementations: ["js"],
  currencies: {
    polkadot: {
      FIXME_ignoreAccountFields: [
        "polkadotResources.unlockings", // Due to completion date that change everyday (estimated time)
        "polkadotResources.nominations", // TODO: try to only ignore status
        "polkadotResources.unlockedBalance", // It moved when an unbond is finished
      ],
      scanAccounts: [
        {
          name: "polkadot seed 1",
          apdus: `
          => 90010000142c00008062010080000000000000000000000000
          <= 7001f89e1fccbbd92e6c5fc9b6ae4f442d791450eb8d03c1e42392dda5f1d40831335872783245775644554b4a566551695833755878576b3677504d4171557641576d38315a466b48357632436a6b799000
          => 90010000142c00008062010080000000800000008000000080
          <= 396b4b24c10b595938876d4a804106803fa2c08b7943e37b001376da0c40009931324a48627731766e587871734436553579413375394b7176703941375a6933714d3272684172655a7150357a556d539000
          => 90010000142c00008062010080010000800000008000000080
          <= 72783c94f6640b13ba5ce47f7eae3c9b5a06baca681bb169720c48773cb13e7c3133623642463634434e3770343263553479394e3571574b7036474b477377667a7a6841385233656d694e66674159369000
          => 90010000142c00008062010080020000800000008000000080
          <= 6bbf0d00e55aa723fe219927787040d7126e5ad7c55659890bad6787092ba7713133534773754736533153654c66656e75536175514d437a637472337a39534e4b723867626e587345747959696a6b549000
          => 90010000142c00008062010080030000800000008000000080
          <= bc54dd82d1a0a63e2290bb8d24b106a6d32208ec6444027264e3ba4ab0d6024c31354677444c37546b524a4679474b396f36695969716a464d314d727136565858766446513961376d355451617955599000
          => 90010000142c00008062010080040000800000008000000080
          <= b89a1a114ff8d16a9cb1da919a74a728b02c75f4f7a47641b280df2b0a816942313542336239317a6e70783452734273337374714636436d734d756341377a7859374b334c425237346d78676b3976459000
          => 90010000142c00008062010080050000800000008000000080
          <= 187352e26a94609923ee72792e70dff4b5f2daaef6a4160f6ab296263efde583315a3451647a52727056626767596f474b35706662654d797a705656444b3757786865566a57467866763673786a569000
          => 90010000142c00008062010080060000800000008000000080
          <= 35b082532e6c550970354690400abbfc52f76f1ae875d5eb11c645fdac12a1be31324450794e7754707a45794562556f38735a3173355a51463967767744646d62446d425a6f703942776a4d73376e4e9000
          => 90010000142c00008062010080070000800000008000000080
          <= bfc15999c7636f5642cb7b0bc9ec742ab43c7f5ad888323f97cb30f34129b40531354c52616f787a553331754e59503967744e446d4b42436d326438697138313732484d767a794a656f7650593650709000
          => 90010000142c00008062010080080000800000008000000080
          <= 20419f215b8220121cb439f15ad595dcc8c2392ad1ab65a4aca7585efa461c45316a4a325754624b374c62676a646b4a534235744c7650514d36474b5a475a6a6a427a6f4b34706a6e3152513644699000
          `,
        },
      ],
      accounts: [
        {
          // Account which is stash and controller
          raw: {
            id:
              "js:2:polkadot:12JHbw1vnXxqsD6U5yA3u9Kqvp9A7Zi3qM2rhAreZqP5zUmS:polkadotbip44",
            seedIdentifier: "12JHbw1vnXxqsD6U5yA3u9Kqvp9A7Zi3qM2rhAreZqP5zUmS",
            name: "Polkadot 1",
            derivationMode: "polkadotbip44",
            index: 0,
            freshAddress: "12JHbw1vnXxqsD6U5yA3u9Kqvp9A7Zi3qM2rhAreZqP5zUmS",
            freshAddressPath: "44'/354'/0'/0'/0'",
            freshAddresses: [],
            blockHeight: 0,
            operations: [],
            pendingOperations: [],
            currencyId: "polkadot",
            unitMagnitude: 10,
            lastSyncDate: "",
            balance: "21000310",
          },
          transactions: [
            {
              name: "recipient and sender must not be the same",
              transaction: fromTransactionRaw({
                family: "polkadot",
                recipient: "12JHbw1vnXxqsD6U5yA3u9Kqvp9A7Zi3qM2rhAreZqP5zUmS",
                amount: "100000000",
                mode: "send",
                era: null,
                validators: [],
                fees: null,
                rewardDestination: null,
                numSlashingSpans: 0,
              }),
              expectedStatus: {
                amount: BigNumber("100000000"),
                errors: {
                  recipient: new InvalidAddressBecauseDestinationIsAlsoSource(),
                },
                warnings: {},
              },
            },
            {
              name: "Not a valid address",
              transaction: fromTransactionRaw({
                family: "polkadot",
                recipient: "ewrererewrew",
                amount: "100000000",
                mode: "send",
                era: null,
                validators: [],
                fees: null,
                rewardDestination: null,
                numSlashingSpans: 0,
              }),
              expectedStatus: {
                errors: {
                  recipient: new InvalidAddress(),
                },
                warnings: {},
              },
            },
            {
              name: "Amount Required",
              transaction: fromTransactionRaw({
                family: "polkadot",
                recipient: ACCOUNT_CONTROLLER,
                amount: "0",
                mode: "send",
                era: null,
                validators: [],
                fees: null,
                rewardDestination: null,
                numSlashingSpans: 0,
              }),
              expectedStatus: {
                errors: {
                  amount: new AmountRequired(),
                },
                warnings: {},
              },
            },
            {
              name: "Not enough balance",
              transaction: fromTransactionRaw({
                family: "polkadot",
                recipient: ACCOUNT_CONTROLLER,
                amount: "100000000000000000",
                mode: "send",
                era: null,
                validators: [],
                fees: null,
                rewardDestination: null,
                numSlashingSpans: 0,
              }),
              expectedStatus: {
                errors: {
                  amount: new NotEnoughBalance(),
                },
                warnings: {},
              },
            },
            {
              name: "Not created account and deposit not existing",
              transaction: fromTransactionRaw({
                family: "polkadot",
                recipient: ACCOUNT_WITH_NO_OPERATION,
                amount: "1000000",
                mode: "send",
                era: null,
                validators: [],
                fees: null,
                rewardDestination: null,
                numSlashingSpans: 0,
              }),
              expectedStatus: {
                errors: {
                  amount: new NotEnoughBalanceBecauseDestinationNotCreated(),
                },
                warnings: {},
              },
            },
            {
              name: "New account and suffisent deposit",
              transaction: fromTransactionRaw({
                family: "polkadot",
                recipient: ACCOUNT_WITH_NO_OPERATION,
                amount: "10000000000",
                mode: "send",
                era: null,
                validators: [],
                fees: null,
                rewardDestination: null,
                numSlashingSpans: 0,
              }),
              expectedStatus: {
                amount: BigNumber("10000000000"),
                errors: {},
                warnings: {},
              },
            },
            {
              name: "[send] use all amount",
              transaction: (t) => ({
                ...t,
                useAllAmount: true,
                mode: "send",
                recipient: ACCOUNT_EMPTY,
              }),
              expectedStatus: (account) => ({
                errors: {},
                warnings: {},
                totalSpent: account.spendableBalance,
              }),
            },
            {
              name: "nominate without true validator",
              transaction: fromTransactionRaw({
                family: "polkadot",
                recipient: "12JHbw1vnXxqsD6U5yA3u9Kqvp9A7Zi3qM2rhAreZqP5zUmS",
                amount: "0",
                mode: "nominate",
                era: null,
                validators: [
                  "12JHbw1vnXxqsD6U5yA3u9Kqvp9A7Zi3qM2rhAreZqP5zUmS",
                ],
                fees: null,
                rewardDestination: null,
                numSlashingSpans: 0,
              }),
              expectedStatus: {
                errors: {
                  staking: new PolkadotNotValidator(),
                },
                warnings: {},
              },
            },
            {
              name: "nominate is empty",
              transaction: fromTransactionRaw({
                family: "polkadot",
                recipient: "12JHbw1vnXxqsD6U5yA3u9Kqvp9A7Zi3qM2rhAreZqP5zUmS",
                amount: "0",
                mode: "nominate",
                era: null,
                validators: [],
                fees: null,
                rewardDestination: null,
                numSlashingSpans: 0,
              }),
              expectedStatus: {
                errors: {
                  staking: new PolkadotValidatorsRequired(),
                },
                warnings: {},
              },
            },
            {
              name: "bond extra - success",
              transaction: fromTransactionRaw({
                family: "polkadot",
                recipient: "12JHbw1vnXxqsD6U5yA3u9Kqvp9A7Zi3qM2rhAreZqP5zUmS",
                amount: "2000000",
                mode: "bond",
                era: null,
                validators: null,
                fees: null,
                rewardDestination: null,
                numSlashingSpans: 0,
              }),
              expectedStatus: {
                errors: {},
                warnings: {},
                amount: BigNumber("2000000"),
              },
            },
            {
              name: "bond extra - not enought spendable",
              transaction: fromTransactionRaw({
                family: "polkadot",
                recipient: "12JHbw1vnXxqsD6U5yA3u9Kqvp9A7Zi3qM2rhAreZqP5zUmS",
                amount: "2000000000000000000",
                mode: "bond",
                era: null,
                validators: null,
                fees: null,
                rewardDestination: null,
                numSlashingSpans: 0,
              }),
              expectedStatus: {
                errors: {
                  amount: new NotEnoughBalance(),
                },
                warnings: {},
              },
            },
            {
              name: "[Bond] New controller and suffisent deposit",
              transaction: fromTransactionRaw({
                family: "polkadot",
                recipient: ACCOUNT_EMPTY,
                amount: "10000000000",
                mode: "bond",
                era: null,
                validators: [],
                fees: null,
                rewardDestination: null,
                numSlashingSpans: 0,
              }),
              expectedStatus: {
                amount: BigNumber("10000000000"),
                errors: {},
                warnings: {},
              },
            },
            {
              name: "[bond] use all amount",
              transaction: (t) => ({
                ...t,
                useAllAmount: true,
                mode: "bond",
              }),
              expectedStatus: (account) => ({
                errors: {},
                warnings: {},
                totalSpent: account.spendableBalance,
              }),
            },
            {
              name: "[unbond] no amount",
              transaction: fromTransactionRaw({
                family: "polkadot",
                recipient: "",
                amount: "0",
                mode: "unbond",
                era: null,
                validators: [],
                fees: null,
                rewardDestination: null,
                numSlashingSpans: 0,
              }),
              expectedStatus: {
                errors: {
                  amount: new AmountRequired(),
                },
                warnings: {},
              },
            },
            {
              name: "[unbond] not enough locked balance",
              transaction: fromTransactionRaw({
                family: "polkadot",
                recipient: "",
                amount: "2000000000000000",
                mode: "unbond",
                era: null,
                validators: [],
                fees: null,
                rewardDestination: null,
                numSlashingSpans: 0,
              }),
              expectedStatus: {
                errors: {
                  amount: new NotEnoughBalance(),
                },
                warnings: {},
              },
            },
            {
              name: "[rebond] no amount",
              transaction: fromTransactionRaw({
                family: "polkadot",
                recipient: "",
                amount: "0",
                mode: "rebond",
                era: null,
                validators: [],
                fees: null,
                rewardDestination: null,
                numSlashingSpans: 0,
              }),
              expectedStatus: {
                errors: {
                  amount: new AmountRequired(),
                },
                warnings: {},
              },
            },
            {
              name: "[unbond] use all amount",
              transaction: (t) => ({
                ...t,
                useAllAmount: true,
                mode: "unbond",
              }),
              expectedStatus: (a) => ({
                errors: {},
                warnings: {},
                amount: a.polkadotResources?.lockedBalance.minus(
                  a.polkadotResources.unlockingBalance
                ),
              }),
            },
            {
              name: "[rebond] use all amount",
              transaction: (t) => ({
                ...t,
                useAllAmount: true,
                mode: "rebond",
              }),
              expectedStatus: (a) => ({
                errors: {},
                warnings: {},
                amount: a.polkadotResources?.unlockingBalance,
              }),
            },
          ],
        },
        {
          raw: {
            id:
              "js:2:polkadot:13SGsuG6S1SeLfenuSauQMCzctr3z9SNKr8gbnXsEtyYijkT:polkadotbip44",
            seedIdentifier: ACCOUNT_STASH,
            name: "Polkadot 2",
            derivationMode: "polkadotbip44",
            index: 0,
            freshAddress: ACCOUNT_STASH,
            freshAddressPath: "44'/354'/2'/0'/0'",
            freshAddresses: [],
            blockHeight: 0,
            operations: [],
            pendingOperations: [],
            currencyId: "polkadot",
            unitMagnitude: 10,
            lastSyncDate: "",
            balance: "11000000000",
          },
          transactions: [
            {
              name: "stash can't nominate",
              transaction: fromTransactionRaw({
                family: "polkadot",
                recipient: "12JHbw1vnXxqsD6U5yA3u9Kqvp9A7Zi3qM2rhAreZqP5zUmS",
                amount: "0",
                mode: "nominate",
                era: null,
                validators: [
                  "12JHbw1vnXxqsD6U5yA3u9Kqvp9A7Zi3qM2rhAreZqP5zUmS",
                ],
                fees: null,
                rewardDestination: null,
                numSlashingSpans: 0,
              }),
              expectedStatus: {
                errors: {
                  staking: new PolkadotUnauthorizedOperation(),
                },
                warnings: {},
              },
            },
            {
              name: "[chill] unauthorized",
              transaction: fromTransactionRaw({
                family: "polkadot",
                recipient: "",
                amount: "1000",
                mode: "chill",
                era: null,
                validators: [],
                fees: null,
                rewardDestination: null,
                numSlashingSpans: 0,
              }),
              expectedStatus: {
                errors: {
                  staking: new PolkadotUnauthorizedOperation(),
                },
                warnings: {},
              },
            },
            {
              name: "[rebond] unauthorized",
              transaction: fromTransactionRaw({
                family: "polkadot",
                recipient: "",
                amount: "1000",
                mode: "rebond",
                era: null,
                validators: [],
                fees: null,
                rewardDestination: null,
                numSlashingSpans: 0,
              }),
              expectedStatus: {
                errors: {
                  staking: new PolkadotUnauthorizedOperation(),
                },
                warnings: {},
              },
            },
            {
              name: "[withdrawUnbonded] unauthorized",
              transaction: fromTransactionRaw({
                family: "polkadot",
                recipient: "",
                amount: "1000",
                mode: "withdrawUnbonded",
                era: null,
                validators: [],
                fees: null,
                rewardDestination: null,
                numSlashingSpans: 0,
              }),
              expectedStatus: {
                errors: {
                  staking: new PolkadotUnauthorizedOperation(),
                },
                warnings: {},
              },
            },
          ],
        },
        {
          raw: {
            id:
              "js:2:polkadot:15FwDL7TkRJFyGK9o6iYiqjFM1Mrq6VXXvdFQ9a7m5TQayUY:polkadotbip44",
            seedIdentifier: ACCOUNT_CONTROLLER,
            name: "Polkadot 3",
            derivationMode: "polkadotbip44",
            index: 0,
            freshAddress: ACCOUNT_CONTROLLER,
            freshAddressPath: "44'/354'/3'/0'/0'",
            freshAddresses: [],
            blockHeight: 0,
            operations: [],
            pendingOperations: [],
            currencyId: "polkadot",
            unitMagnitude: 10,
            lastSyncDate: "",
            balance: "11000000000",
          },
          transactions: [
            {
              name: "[bond] no recipient",
              transaction: fromTransactionRaw({
                family: "polkadot",
                recipient: "",
                amount: "0",
                mode: "bond",
                era: null,
                validators: [],
                fees: null,
                rewardDestination: null,
                numSlashingSpans: 0,
              }),
              expectedStatus: {
                errors: {
                  recipient: new RecipientRequired(),
                },
                warnings: {},
              },
            },
            {
              name: "[bond] recipient with invalid address",
              transaction: fromTransactionRaw({
                family: "polkadot",
                recipient: "not a valid address",
                amount: "0",
                mode: "bond",
                era: null,
                validators: [],
                fees: null,
                rewardDestination: null,
                numSlashingSpans: 0,
              }),
              expectedStatus: {
                errors: {
                  recipient: new InvalidAddress(),
                },
                warnings: {},
              },
            },
            {
              name: "[bond] is already controller",
              transaction: fromTransactionRaw({
                family: "polkadot",
                recipient: ACCOUNT_CONTROLLER,
                amount: "100000000",
                mode: "bond",
                era: null,
                validators: [],
                fees: null,
                rewardDestination: null,
                numSlashingSpans: 0,
              }),
              expectedStatus: {
                errors: {
                  recipient: new PolkadotUnauthorizedOperation(
                    "Recipient is already a controller"
                  ),
                },
                warnings: {},
              },
            },
            {
              name: "[bond] not minimum amount",
              transaction: fromTransactionRaw({
                family: "polkadot",
                recipient: ACCOUNT_CONTROLLER,
                amount: "1000000",
                mode: "bond",
                era: null,
                validators: [],
                fees: null,
                rewardDestination: null,
                numSlashingSpans: 0,
              }),
              expectedStatus: {
                errors: {
                  amount: new PolkadotBondMinimumAmount(),
                },
                warnings: {},
              },
            },
            {
              name: "[bond] success",
              transaction: fromTransactionRaw({
                family: "polkadot",
                recipient: ACCOUNT_CONTROLLER,
                amount: "10000000000",
                mode: "bond",
                era: null,
                validators: [],
                fees: null,
                rewardDestination: null,
                numSlashingSpans: 0,
              }),
              expectedStatus: {
                errors: {},
                warnings: {},
              },
            },
            {
              name: "[unbond] haveEnoughLockedBalance",
              transaction: fromTransactionRaw({
                family: "polkadot",
                recipient: "",
                amount: "100000",
                mode: "unbond",
                era: null,
                validators: [],
                fees: null,
                rewardDestination: null,
                numSlashingSpans: 0,
              }),
              expectedStatus: {
                errors: {
                  amount: new NotEnoughBalance(),
                  staking: new PolkadotUnauthorizedOperation(),
                },
                warnings: {},
              },
            },
          ],
        },
      ],
    },
  },
};

export default dataset;
