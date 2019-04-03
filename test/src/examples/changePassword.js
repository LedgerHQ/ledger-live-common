// @flow
/* eslint-disable no-console */

import "babel-polyfill";
import "../live-common-setup";
import "../implement-libcore";

import { withLibcore } from "@ledgerhq/live-common/lib/libcore/access";
import { setEnv } from "@ledgerhq/live-common/lib/env";

if (process.argv.length !== 4) {
  console.error(
    `Usage: ${process.argv[0]} ${process.argv[1]} <oldPassword> <newPassword>`
  );
  process.exit(1);
}

const oldPassword = process.argv[2];
const newPassword = process.argv[3];

setEnv("LIBCORE_PASSWORD", oldPassword);
withLibcore(core =>
  core.getPoolInstance().changePassword(oldPassword, newPassword)
);
