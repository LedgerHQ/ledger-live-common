// @flow

import "babel-polyfill";
import invariant from "invariant";
import { BigNumber } from "bignumber.js";
import { setup } from "../live-common-setup-test";
import { withLibcore } from "@ledgerhq/live-common/lib/libcore/access";
import { getCoreAccount } from "@ledgerhq/live-common/lib/libcore/getCoreAccount";
import buildTransaction from "@ledgerhq/live-common/lib/libcore/buildTransaction";
import getAccountNetworkInfo from "@ledgerhq/live-common/lib/families/tezos/libcore-getAccountNetworkInfo";
import type { NetworkInfo } from "@ledgerhq/live-common/lib/families/tezos/types";
import { tezosOperationTag } from "@ledgerhq/live-common/lib/families/tezos/types";
import { estimateGasLimit } from "@ledgerhq/live-common/lib/families/tezos/bridge/libcore";
import { fromAccountRaw } from "@ledgerhq/live-common/lib/account";

setup("tezos");

describe("tezos", () => {
  test("transaction", async () => {
    expect(account).toBeDefined();
    await withLibcore(async core => {
      const { coreAccount, coreWallet } = await getCoreAccount(core, account);
      const coreCurrency = await coreWallet.getCurrency();
      const networkInfo: NetworkInfo = await getAccountNetworkInfo({
        coreAccount,
        account
      });

      invariant(networkInfo.family === "tezos", "this is tezos");

      const recipient = "tz1cmN7N6rV9ULVqbL2BxSUZgeL5wnWyoBUE";

      const gasLimit = await estimateGasLimit(account, recipient);

      const transaction = {
        family: "tezos",
        type: tezosOperationTag.OPERATION_TAG_TRANSACTION,
        recipient,
        amount: "100",
        networkInfo,
        fees: networkInfo.fees,
        gasLimit,
        storageLimit: BigNumber(0)
      };

      const builded = await buildTransaction({
        core,
        coreAccount,
        coreWallet,
        coreCurrency,
        account,
        transaction,
        isCancelled: () => false,
        isPartial: false
      });

      // eslint-disable-next-line
      console.log(builded);
    });
  });
});

const account = fromAccountRaw({
  id:
    "libcore:1:tezos:xpub6DXuQW1Q2JpZscSeeJNSfPja1JJrFCt8FkAv1hBs7Pzhv6tEG4XKd9aQv1eHuhnf9SoTGMpXAbBD5QK2S6SXHdDBc8cUJivCqnF71uVBurz:tezbox",
  seedIdentifier:
    "xpub6DXuQW1Q2JpZscSeeJNSfPja1JJrFCt8FkAv1hBs7Pzhv6tEG4XKd9aQv1eHuhnf9SoTGMpXAbBD5QK2S6SXHdDBc8cUJivCqnF71uVBurz",
  name: "Tezos tezbox xpub6DXu...71uVBurz",
  derivationMode: "tezbox",
  index: 0,
  freshAddress: "tz1cmN7N6rV9ULVqbL2BxSUZgeL5wnWyoBUE",
  freshAddressPath: "44'/1729'/0'/0'",
  freshAddresses: [],
  blockHeight: 610299,
  operations: [
    {
      id:
        "libcore:1:tezos:xpub6DXuQW1Q2JpZscSeeJNSfPja1JJrFCt8FkAv1hBs7Pzhv6tEG4XKd9aQv1eHuhnf9SoTGMpXAbBD5QK2S6SXHdDBc8cUJivCqnF71uVBurz:tezbox-opVFeKkgFDdoeNnBBsfkHA1tz9ZfHPm5zAZKJXbAP6WTWtBUGCY-IN",
      type: "IN",
      senders: ["KT1JLbEZuWFhEyHXtKsvbCNZABXGehkjVyCd"],
      recipients: ["tz1cmN7N6rV9ULVqbL2BxSUZgeL5wnWyoBUE"],
      blockHeight: 441021,
      blockHash: null,
      accountId:
        "libcore:1:tezos:xpub6DXuQW1Q2JpZscSeeJNSfPja1JJrFCt8FkAv1hBs7Pzhv6tEG4XKd9aQv1eHuhnf9SoTGMpXAbBD5QK2S6SXHdDBc8cUJivCqnF71uVBurz:tezbox",
      extra: {},
      hash: "opVFeKkgFDdoeNnBBsfkHA1tz9ZfHPm5zAZKJXbAP6WTWtBUGCY",
      date: "2019-05-17T07:49:15.000Z",
      value: "150000",
      fee: "1420"
    },
    {
      id:
        "libcore:1:tezos:xpub6DXuQW1Q2JpZscSeeJNSfPja1JJrFCt8FkAv1hBs7Pzhv6tEG4XKd9aQv1eHuhnf9SoTGMpXAbBD5QK2S6SXHdDBc8cUJivCqnF71uVBurz:tezbox-ooxSmgcPiGfg25QGEjaDRKbphDwifETGfZKZjwBGgB2MAcHs8WV-OUT",
      type: "OUT",
      senders: ["tz1cmN7N6rV9ULVqbL2BxSUZgeL5wnWyoBUE"],
      recipients: ["KT1JLbEZuWFhEyHXtKsvbCNZABXGehkjVyCd"],
      blockHeight: 441019,
      blockHash: null,
      accountId:
        "libcore:1:tezos:xpub6DXuQW1Q2JpZscSeeJNSfPja1JJrFCt8FkAv1hBs7Pzhv6tEG4XKd9aQv1eHuhnf9SoTGMpXAbBD5QK2S6SXHdDBc8cUJivCqnF71uVBurz:tezbox",
      extra: {},
      hash: "ooxSmgcPiGfg25QGEjaDRKbphDwifETGfZKZjwBGgB2MAcHs8WV",
      date: "2019-05-17T07:47:15.000Z",
      value: "1301420",
      fee: "1420"
    },
    {
      id:
        "libcore:1:tezos:xpub6DXuQW1Q2JpZscSeeJNSfPja1JJrFCt8FkAv1hBs7Pzhv6tEG4XKd9aQv1eHuhnf9SoTGMpXAbBD5QK2S6SXHdDBc8cUJivCqnF71uVBurz:tezbox-oooSsXHXVwrW1mMygVP1HWdtoLDspMyUC9JSVPGAuUPGT99Znb7-OUT",
      type: "OUT",
      senders: ["tz1cmN7N6rV9ULVqbL2BxSUZgeL5wnWyoBUE"],
      recipients: ["KT1WUBkzTPSawsNzB3uJjk2kcRJNp5j88K3J"],
      blockHeight: 441012,
      blockHash: null,
      accountId:
        "libcore:1:tezos:xpub6DXuQW1Q2JpZscSeeJNSfPja1JJrFCt8FkAv1hBs7Pzhv6tEG4XKd9aQv1eHuhnf9SoTGMpXAbBD5QK2S6SXHdDBc8cUJivCqnF71uVBurz:tezbox",
      extra: {},
      hash: "oooSsXHXVwrW1mMygVP1HWdtoLDspMyUC9JSVPGAuUPGT99Znb7",
      date: "2019-05-17T07:40:15.000Z",
      value: "1001420",
      fee: "1420"
    },
    {
      id:
        "libcore:1:tezos:xpub6DXuQW1Q2JpZscSeeJNSfPja1JJrFCt8FkAv1hBs7Pzhv6tEG4XKd9aQv1eHuhnf9SoTGMpXAbBD5QK2S6SXHdDBc8cUJivCqnF71uVBurz:tezbox-opTgrstBbtV84VqHZ8iNdsUyQNuNMv8X2FwJXYpKeZ2MM72CY8x-OUT",
      type: "OUT",
      senders: ["tz1cmN7N6rV9ULVqbL2BxSUZgeL5wnWyoBUE"],
      recipients: [""],
      blockHeight: 439824,
      blockHash: null,
      accountId:
        "libcore:1:tezos:xpub6DXuQW1Q2JpZscSeeJNSfPja1JJrFCt8FkAv1hBs7Pzhv6tEG4XKd9aQv1eHuhnf9SoTGMpXAbBD5QK2S6SXHdDBc8cUJivCqnF71uVBurz:tezbox",
      extra: {},
      hash: "opTgrstBbtV84VqHZ8iNdsUyQNuNMv8X2FwJXYpKeZ2MM72CY8x",
      date: "2019-05-16T11:29:01.000Z",
      value: "258400",
      fee: "258400"
    },
    {
      id:
        "libcore:1:tezos:xpub6DXuQW1Q2JpZscSeeJNSfPja1JJrFCt8FkAv1hBs7Pzhv6tEG4XKd9aQv1eHuhnf9SoTGMpXAbBD5QK2S6SXHdDBc8cUJivCqnF71uVBurz:tezbox-ooPbtVVy7TZLoRirGsCgyy6Esyqm3Kj22QvEVpAmEXX3vHBGbF8-OUT",
      type: "OUT",
      senders: ["tz1cmN7N6rV9ULVqbL2BxSUZgeL5wnWyoBUE"],
      recipients: ["KT1GdNaQowD3r8VprK8pni2R2DZd5Vxnkvw5"],
      blockHeight: 424461,
      blockHash: null,
      accountId:
        "libcore:1:tezos:xpub6DXuQW1Q2JpZscSeeJNSfPja1JJrFCt8FkAv1hBs7Pzhv6tEG4XKd9aQv1eHuhnf9SoTGMpXAbBD5QK2S6SXHdDBc8cUJivCqnF71uVBurz:tezbox",
      extra: {},
      hash: "ooPbtVVy7TZLoRirGsCgyy6Esyqm3Kj22QvEVpAmEXX3vHBGbF8",
      date: "2019-05-05T11:51:19.000Z",
      value: "101420",
      fee: "1420"
    },
    {
      id:
        "libcore:1:tezos:xpub6DXuQW1Q2JpZscSeeJNSfPja1JJrFCt8FkAv1hBs7Pzhv6tEG4XKd9aQv1eHuhnf9SoTGMpXAbBD5QK2S6SXHdDBc8cUJivCqnF71uVBurz:tezbox-onnctKkBCT2odF4HGjNd2YF3Qua23qh5YZPTFiLXb1HkGg9ANXC-OUT",
      type: "OUT",
      senders: ["tz1cmN7N6rV9ULVqbL2BxSUZgeL5wnWyoBUE"],
      recipients: [""],
      blockHeight: 424384,
      blockHash: null,
      accountId:
        "libcore:1:tezos:xpub6DXuQW1Q2JpZscSeeJNSfPja1JJrFCt8FkAv1hBs7Pzhv6tEG4XKd9aQv1eHuhnf9SoTGMpXAbBD5QK2S6SXHdDBc8cUJivCqnF71uVBurz:tezbox",
      extra: {},
      hash: "onnctKkBCT2odF4HGjNd2YF3Qua23qh5YZPTFiLXb1HkGg9ANXC",
      date: "2019-05-05T10:30:34.000Z",
      value: "258400",
      fee: "258400"
    },
    {
      id:
        "libcore:1:tezos:xpub6DXuQW1Q2JpZscSeeJNSfPja1JJrFCt8FkAv1hBs7Pzhv6tEG4XKd9aQv1eHuhnf9SoTGMpXAbBD5QK2S6SXHdDBc8cUJivCqnF71uVBurz:tezbox-onnctKkBCT2odF4HGjNd2YF3Qua23qh5YZPTFiLXb1HkGg9ANXC-OUT",
      type: "OUT",
      senders: ["tz1cmN7N6rV9ULVqbL2BxSUZgeL5wnWyoBUE"],
      recipients: [""],
      blockHeight: 424384,
      blockHash: null,
      accountId:
        "libcore:1:tezos:xpub6DXuQW1Q2JpZscSeeJNSfPja1JJrFCt8FkAv1hBs7Pzhv6tEG4XKd9aQv1eHuhnf9SoTGMpXAbBD5QK2S6SXHdDBc8cUJivCqnF71uVBurz:tezbox",
      extra: {},
      hash: "onnctKkBCT2odF4HGjNd2YF3Qua23qh5YZPTFiLXb1HkGg9ANXC",
      date: "2019-05-05T10:30:34.000Z",
      value: "1269",
      fee: "1269"
    },
    {
      id:
        "libcore:1:tezos:xpub6DXuQW1Q2JpZscSeeJNSfPja1JJrFCt8FkAv1hBs7Pzhv6tEG4XKd9aQv1eHuhnf9SoTGMpXAbBD5QK2S6SXHdDBc8cUJivCqnF71uVBurz:tezbox-opCpARNkFZM8ugpEv26FQ9nxYoQKZHJBZveFFuExqZp9gJqixA6-IN",
      type: "IN",
      senders: ["KT1GdNaQowD3r8VprK8pni2R2DZd5Vxnkvw5"],
      recipients: ["tz1cmN7N6rV9ULVqbL2BxSUZgeL5wnWyoBUE"],
      blockHeight: 417723,
      blockHash: null,
      accountId:
        "libcore:1:tezos:xpub6DXuQW1Q2JpZscSeeJNSfPja1JJrFCt8FkAv1hBs7Pzhv6tEG4XKd9aQv1eHuhnf9SoTGMpXAbBD5QK2S6SXHdDBc8cUJivCqnF71uVBurz:tezbox",
      extra: {},
      hash: "opCpARNkFZM8ugpEv26FQ9nxYoQKZHJBZveFFuExqZp9gJqixA6",
      date: "2019-04-30T15:49:01.000Z",
      value: "10000000",
      fee: "1420"
    }
  ],
  pendingOperations: [],
  currencyId: "tezos",
  unitMagnitude: 6,
  lastSyncDate: "2019-09-16T12:21:31.136Z",
  balance: "7227671",
  xpub:
    "xpub6DXuQW1Q2JpZscSeeJNSfPja1JJrFCt8FkAv1hBs7Pzhv6tEG4XKd9aQv1eHuhnf9SoTGMpXAbBD5QK2S6SXHdDBc8cUJivCqnF71uVBurz"
});
