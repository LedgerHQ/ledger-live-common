// @flow

import { BigNumber } from "bignumber.js";
import type { DatasetTest } from "../../__tests__/test-helpers/bridge";
import {
  InvalidAddressBecauseDestinationIsAlsoSource,
  NotEnoughBalance
} from "@ledgerhq/errors";
import type { Transaction } from "./types";
import transactionTransformer from "./transaction";
import {
  StellarWrongMemoFormat,
  StellarMinimumBalanceWarning,
  StellarNewAccountMinimumTransaction
} from "../../errors";

const dataset: DatasetTest<Transaction> = {
  implementations: ["libcore"],
  currencies: {
    stellar: {
      scanAccounts: [
        {
          name: "stellar seed 1",
          apdus: `
            => e002000013028000002c80000094766961206c756d696e61
            <= cb3d982e538ffe77a40f9179096db07a14ecec5669933cc3e47309be848c66a99000
            => e002000017038000002c8000009480000000766961206c756d696e61
            <= c74e1ced14b3a0a3c45ca4553e4e0af5320780de53670a7a1a17055533c85b279000
            => e002000017038000002c8000009480000001766961206c756d696e61
            <= 133b5b8e31fa1b1667d705f9190302d48d1e95169773947ddec1d2a192b93a009000
            => e002000017038000002c8000009480000002766961206c756d696e61
            <= 1f1eb360758c16bc548e99b68fba1ebdae00a9132f720085a897bd638c128f5f9000
            => e002000017038000002c8000009480000003766961206c756d696e61
            <= 0d4a1cfe3b6143ebbd5848d5219d3cd26acafd3adbf57bc7d08e664562a018819000
          `
        }
      ],
      accounts: [
        {
          FIXME_tests: ["balance is sum of ops"],
          raw: {
            id:
              "libcore:1:stellar:GAT4LBXYJGJJJRSNK74NPFLO55CDDXSYVMQODSEAAH3M6EY4S7LPH5GV:sep5",
            seedIdentifier:
              "cb3d982e538ffe77a40f9179096db07a14ecec5669933cc3e47309be848c66a9",
            name: "Stellar 1",
            derivationMode: "sep5",
            index: 0,
            freshAddress:
              "GDDU4HHNCSZ2BI6ELSSFKPSOBL2TEB4A3ZJWOCT2DILQKVJTZBNSOZA2",
            freshAddressPath: "44'/148'/0'",
            freshAddresses: [
              {
                address:
                  "GDDU4HHNCSZ2BI6ELSSFKPSOBL2TEB4A3ZJWOCT2DILQKVJTZBNSOZA2",
                derivationPath: "44'/148'/0'"
              }
            ],
            unit: { name: "Lumen", code: "XLM", magnitude: 7 },
            blockHeight: 28282963,
            operations: [],
            pendingOperations: [],
            currencyId: "stellar",
            unitMagnitude: 7,
            lastSyncDate: "",
            balance: "127738083",
            spendableBalance: "127738083",
            xpub: "GDDU4HHNCSZ2BI6ELSSFKPSOBL2TEB4A3ZJWOCT2DILQKVJTZBNSOZA2"
          },
          transactions: [
            {
              name: "Same as Recipient",
              transaction: t => ({
                ...t,
                amount: BigNumber(100),
                recipient:
                  "GDDU4HHNCSZ2BI6ELSSFKPSOBL2TEB4A3ZJWOCT2DILQKVJTZBNSOZA2"
              }),
              expectedStatus: {
                errors: {
                  recipient: new InvalidAddressBecauseDestinationIsAlsoSource()
                },
                warnings: {}
              }
            },
            {
              name: "Send Max Warning",
              transaction: transactionTransformer.fromTransactionRaw({
                amount: "0",
                recipient:
                  "GAIXIJBMYPTSF2CDVQ35WOTULCLZIE4W2SDEK3RQGAA3A22BPWY7R53Z",
                useAllAmount: true,
                family: "stellar",
                baseReserve: "1500000",
                networkInfo: {
                  family: "stellar",
                  fees: "100",
                  baseReserve: "1500000"
                },
                fees: "100",
                memoType: null,
                memoValue: null,
                memoTypeRecommended: false
              }),
              expectedStatus: {
                errors: {},
                warnings: { amount: new StellarMinimumBalanceWarning() }
              }
            },
            {
              name: "Send To New Account - amount is too low",
              transaction: transactionTransformer.fromTransactionRaw({
                amount: "1000",
                recipient:
                  "GAGUUHH6HNQUH255LBENKIM5HTJGVSX5HLN7K66H2CHGMRLCUAMICGYC",
                useAllAmount: false,
                family: "stellar",
                baseReserve: "1500000",
                networkInfo: {
                  family: "stellar",
                  fees: "100",
                  baseReserve: "1500000"
                },
                fees: "100",
                memoType: null,
                memoValue: null,
                memoTypeRecommended: false
              }),
              expectedStatus: {
                errors: { amount: new StellarNewAccountMinimumTransaction() },
                warnings: {}
              }
            },
            {
              name: "send amount more than fees + base reserve",
              transaction: (t, account) => ({
                ...t,
                amount: account.balance,
                recipient:
                  "GAIXIJBMYPTSF2CDVQ35WOTULCLZIE4W2SDEK3RQGAA3A22BPWY7R53Z"
              }),
              expectedStatus: {
                errors: { amount: new NotEnoughBalance() },
                warnings: {}
              }
            },
            {
              name: "send more than base reserve",
              transaction: (t, account) => ({
                ...t,
                amount: account.balance.minus("100"),
                recipient:
                  "GAIXIJBMYPTSF2CDVQ35WOTULCLZIE4W2SDEK3RQGAA3A22BPWY7R53Z"
              }),
              expectedStatus: {
                errors: { amount: new NotEnoughBalance() },
                warnings: {}
              }
            },
            {
              name: "send max to new account (explicit)",
              transaction: transactionTransformer.fromTransactionRaw({
                amount: "0",
                recipient:
                  "GAIXIJBMYPTSF2CDVQ35WOTULCLZIE4W2SDEK3RQGAA3A22BPWY7R53Z",
                useAllAmount: true,
                family: "stellar",
                baseReserve: "1500000",
                networkInfo: {
                  family: "stellar",
                  fees: "100",
                  baseReserve: "1500000"
                },
                fees: "100",
                memoType: null,
                memoValue: null,
                memoTypeRecommended: false
              }),
              expectedStatus: account => ({
                errors: {},
                warnings: {},
                estimatedFees: BigNumber("100"),
                amount: account.balance.minus("1500000").minus("100"),
                totalSpent: account.balance.minus("1500000")
              })
            },
            {
              name: "memo text - success",
              transaction: t => ({
                ...t,
                amount: BigNumber(100),
                recipient:
                  "GAIXIJBMYPTSF2CDVQ35WOTULCLZIE4W2SDEK3RQGAA3A22BPWY7R53Z",
                memoType: "MEMO_TEXT",
                memoValue: "01234"
              }),
              expectedStatus: {
                errors: {},
                warnings: {}
              }
            },
            {
              name: "memo text - error",
              transaction: t => ({
                ...t,
                amount: BigNumber(100),
                recipient:
                  "GAIXIJBMYPTSF2CDVQ35WOTULCLZIE4W2SDEK3RQGAA3A22BPWY7R53Z",
                memoType: "MEMO_TEXT",
                memoValue: "0123456789012345678901234567890123456789"
              }),
              expectedStatus: {
                errors: { transaction: new StellarWrongMemoFormat() },
                warnings: {}
              }
            },
            {
              name: "memo id - success",
              transaction: t => ({
                ...t,
                amount: BigNumber(100),
                recipient:
                  "GAIXIJBMYPTSF2CDVQ35WOTULCLZIE4W2SDEK3RQGAA3A22BPWY7R53Z",
                memoType: "MEMO_ID",
                memoValue: "22"
              }),
              expectedStatus: {
                errors: {},
                warnings: {}
              }
            },
            {
              name: "memo id - error",
              transaction: t => ({
                ...t,
                amount: BigNumber(100),
                recipient:
                  "GAIXIJBMYPTSF2CDVQ35WOTULCLZIE4W2SDEK3RQGAA3A22BPWY7R53Z",
                memoType: "MEMO_ID",
                memoValue: "btest2"
              }),
              expectedStatus: {
                errors: { transaction: new StellarWrongMemoFormat() },
                warnings: {}
              }
            },
            {
              name: "memo hash - error",
              transaction: t => ({
                ...t,
                amount: BigNumber(100),
                recipient:
                  "GAIXIJBMYPTSF2CDVQ35WOTULCLZIE4W2SDEK3RQGAA3A22BPWY7R53Z",
                memoType: "MEMO_HASH",
                memoValue: "dsadsdasdsasseeee"
              }),
              expectedStatus: {
                errors: { transaction: new StellarWrongMemoFormat() },
                warnings: {}
              }
            },
            {
              name: "Multisign - error",
              transaction: t => ({
                ...t,
                amount: BigNumber(100),
                recipient:
                  "GAIXIJBMYPTSF2CDVQ35WOTULCLZIE4W2SDEK3RQGAA3A22BPWY7R53Z",
                memoType: "MEMO_HASH",
                memoValue: "dsadsdasdsasseeee"
              }),
              expectedStatus: {
                errors: { transaction: new StellarWrongMemoFormat() },
                warnings: {}
              }
            }
          ]
        },
        {
          raw: {
            id:
              "libcore:1:stellar:GAJTWW4OGH5BWFTH24C7SGIDALKI2HUVC2LXHFD533A5FIMSXE5AB3TJ:sep5",
            seedIdentifier:
              "cb3d982e538ffe77a40f9179096db07a14ecec5669933cc3e47309be848c66a9",
            name: "Stellar 1",
            derivationMode: "sep5",
            index: 0,
            freshAddress:
              "GAJTWW4OGH5BWFTH24C7SGIDALKI2HUVC2LXHFD533A5FIMSXE5AB3TJ",
            freshAddressPath: "44'/148'/0'",
            freshAddresses: [
              {
                address:
                  "GAJTWW4OGH5BWFTH24C7SGIDALKI2HUVC2LXHFD533A5FIMSXE5AB3TJ",
                derivationPath: "44'/148'/0'"
              }
            ],
            unit: { name: "Lumen", code: "XLM", magnitude: 7 },
            blockHeight: 28282963,
            operations: [],
            pendingOperations: [],
            currencyId: "stellar",
            unitMagnitude: 7,
            lastSyncDate: "",
            balance: "127738083",
            spendableBalance: "127738083",
            xpub: "GAJTWW4OGH5BWFTH24C7SGIDALKI2HUVC2LXHFD533A5FIMSXE5AB3TJ"
          },
          transactions: [
            {
              name: "Multisign - error",
              transaction: t => ({
                ...t,
                amount: BigNumber(100),
                recipient:
                  "GAIXIJBMYPTSF2CDVQ35WOTULCLZIE4W2SDEK3RQGAA3A22BPWY7R53Z",
                memoType: "MEMO_HASH",
                memoValue: "dsadsdasdsasseeee"
              }),
              expectedStatus: {
                errors: { transaction: new StellarWrongMemoFormat() },
                warnings: {}
              }
            }
          ]
        }
      ]
    }
  }
};

export default dataset;
