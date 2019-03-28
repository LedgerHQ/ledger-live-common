// @flow

import fs from "fs";
import { BigNumber } from "bignumber.js";
import { Observable } from "rxjs";
import { skip, take, reduce } from "rxjs/operators";
import { fromAccountRaw } from "@ledgerhq/live-common/lib/account";
import { syncAccount } from "@ledgerhq/live-common/lib/libcore/syncAccount";
import { scanAccountsOnDevice } from "@ledgerhq/live-common/lib/libcore/scanAccountsOnDevice";
import { getCryptoCurrencyById } from "@ledgerhq/live-common/lib/currencies";

export const currencyOpt = {
  name: "currency",
  alias: "c",
  type: String,
  desc:
    "Identifier of a currency (ledger convention is lowercase/underscore of the currency name)"
};

export const scanCommonOpts = [
  {
    name: "device",
    type: String,
    descOpt: "optional usb path",
    desc: "use the device for the operation"
  },
  {
    name: "xpub",
    type: String,
    desc: "instead of using a device, use this xpub"
  },
  {
    name: "file",
    type: String,
    typeDesc: "filename",
    desc: "instead of using a device, use a file. '-' for stdin"
  },
  currencyOpt,
  {
    name: "scheme",
    alias: "s",
    type: String,
    desc:
      "if provided, filter the derivation path that are scanned by a given sceme. Providing '' empty string will only use the default standard derivation scheme."
  },
  {
    name: "index",
    alias: "i",
    type: Number,
    desc: "select the account by index"
  },
  {
    name: "length",
    alias: "l",
    type: Number,
    desc:
      "set the number of accounts after the index. Defaults to 1 if index was provided, Infinity otherwise."
  }
];

export function scan({ device, xpub, file, currency, scheme, index, length }) {
  const cur = getCryptoCurrencyById(currency || "bitcoin");
  if (device !== undefined) {
    return scanAccountsOnDevice(cur, device || "", mode =>
      typeof scheme === "string" ? scheme.indexOf(mode) > -1 : true
    ).pipe(
      skip(index || 0),
      take(length === undefined ? (index !== undefined ? 1 : Infinity) : length)
    );
  } else if (typeof xpub === "string") {
    const account = {
      name: xpub,
      xpub,
      seedIdentifier: xpub,
      id: `libcore:1:bitcoin:${xpub}:`,
      derivationMode: "",
      currency: cur,
      unit: cur.units[0],
      index: 0,
      freshAddress: "",
      freshAddressPath: "44'/0'/0'/0/0",
      lastSyncDate: new Date(0),
      blockHeight: 0,
      balance: new BigNumber(0),
      operations: [],
      pendingOperations: []
    };
    return syncAccount(account).pipe(
      reduce((account, f) => f(account), account)
    );
  } else if (typeof file === "string") {
    return Observable.create(o => {
      let sub;
      let closed;

      const readStream =
        file === "-" ? process.stdin : fs.createReadStream(file);

      const chunks = [];
      readStream.on("data", chunk => {
        chunks.push(chunk);
      });

      readStream.on("close", () => {
        try {
          if (closed) return;
          const account = fromAccountRaw(
            JSON.parse(Buffer.concat(chunks).toString("ascii"))
          );
          sub = syncAccount(account)
            .pipe(reduce((account, f) => f(account), account))
            .subscribe(o);
        } catch (e) {
          o.error(e);
        }
      });

      readStream.on("error", err => {
        o.error(err);
      });

      return () => {
        closed = true;
        if (sub) sub.unsubscribe();
      };
    });
  }

  throw new Error("missing one of parameter: --device or --xpub or --file");
}
