import type { DatasetTest } from "../../types";
import type { Transaction } from "./types";

// TODO restore
// import tezosScanAccounts1 from "./datasets/tezos.scanAccounts.1";

// FIXME these accounts no longer reflect their expected states..
export const accountTZrevealedDelegating = makeAccount(
  "TZrevealedDelegating",
  "tz1boBHAVpwcvKkNFAQHYr7mjxAz1PpVgKq7",
  "tezbox"
);
/*
const accountTZwithKT = makeAccount(
  "TZwithKT",
  "tz1T72nyqnJWwxad6RQnh7imKQz7mzToamWd",
  "tezbox"
);
*/
const accountTZnew = makeAccount(
  "TZnew",
  "tz1VSichevvJSNkSSntgwKDKikWNB6iqNJii",
  "tezbox"
);
const accountTZnotRevealed = makeAccount(
  "TZnotRevealed",
  "tz1PWFt4Ym6HedY78MgUP2kVDtSampGwprs5",
  "tezosbip44h"
);
const accountTZRevealedNoDelegate = makeAccount(
  "TZRevealedNoDelegate",
  "tz1YkAjh5mm5gJ5u3VbFLEtpAG7cFo7PfCux",
  "tezosbip44h"
);
/*
const accountTZemptyWithKT = makeAccount(
  "TZemptyWithKT",
  "tz1TeawWFnUmeP1qQLf4JWe5D7LaNp1qxgMW",
  "tezbox"
);
*/

const dataset: DatasetTest<Transaction> = {
  implementations: ["js"],
  currencies: {
    tezos: {
      FIXME_ignoreOperationFields: ["blockHeight"],
      // scanAccounts: [tezosScanAccounts1],
      scanAccounts: [],
      accounts: [
        {
          raw: accountTZrevealedDelegating,
          transactions: [],
        },
        {
          raw: accountTZRevealedNoDelegate,
          transactions: [],
        },
        {
          raw: accountTZnotRevealed,
          transactions: [],
        },
        {
          raw: accountTZnew,
          test: (expect, account) => {
            expect(account.operations).toEqual([]);
          },
          transactions: [],
        },
        // FIXME these accounts have issue
        /*
        {
          raw: accountTZwithKT,
          transactions: [
          ],
        },
        */
        /*
        {
          raw: accountTZemptyWithKT,
          transactions: [
          ],
        },
        */
      ],
    },
  },
};
export default dataset;

function makeAccount(name, address, derivationMode) {
  return {
    id: `js:2:tezos:${address}:${derivationMode}`,
    seedIdentifier: address,
    name: "Tezos " + name,
    derivationMode,
    index: 0,
    freshAddress: address,
    freshAddressPath: "",
    freshAddresses: [],
    blockHeight: 0,
    operations: [],
    pendingOperations: [],
    currencyId: "tezos",
    unitMagnitude: 6,
    lastSyncDate: "",
    balance: "0",
    xpub: "",
    subAccounts: [],
  };
}
