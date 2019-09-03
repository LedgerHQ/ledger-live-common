// @flow

export * from "./live-common-setup-without-libcore";

import implementLibcore from "@ledgerhq/live-common/lib/libcore/platforms/nodejs";
implementLibcore({
  lib: () => require("@ledgerhq/ledger-core"), // eslint-disable-line global-require
  dbPath: process.env.LIBCORE_DB_PATH || "./dbdata"
});
