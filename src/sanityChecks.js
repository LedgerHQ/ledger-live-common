// @flow

import { connect } from "react-redux";
import React from "react";
import Transport from "@ledgerhq/hw-transport";
import { NotEnoughBalance } from "@ledgerhq/errors";
import { log } from "@ledgerhq/logs";

export function checkLibs(
  libs: $Shape<{
    NotEnoughBalance: typeof NotEnoughBalance,
    React: typeof React,
    log: typeof log,
    Transport: typeof Transport,
    connect: typeof connect,
  }>
) {
  check(libs.NotEnoughBalance, NotEnoughBalance, "@ledgerhq/errors");
  check(libs.log, log, "@ledgerhq/logs");
  check(libs.Transport, Transport, "@ledgerhq/hw-transport");
  check(libs.React, React, "react");
  check(libs.connect, connect, "react-redux");

  function check(remoteInst, localInst, pkg) {
    if (remoteInst && remoteInst !== localInst) {
      console.warn(`
      ______
      | |__| |
      |  ()  |
      |______|

${pkg} NPM package dup detected! You must \`yarn list ${pkg}\` and dedup with yarn or yarn-deduplicate.

`);
      throw new Error("duplicated " + pkg + " library");
    }
  }
}
