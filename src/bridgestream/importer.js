// @flow

import lzw from "node-lzw";
import type { AccountData, Settings } from "./types";
import { framesToResult } from "../qrstream/importer";

export type Result = {
  accounts: AccountData[],
  settings: Settings,
  meta: {
    exporterName: string,
    exporterVersion: string
  }
};

export function decodeFrames(rawFrames: *): Result {
  const result = framesToResult(rawFrames);
  return JSON.parse(lzw.decode(result));
}
