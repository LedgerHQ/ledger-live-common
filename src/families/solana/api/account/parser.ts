import { ParsedAccountData } from "@solana/web3.js";
import { create } from "superstruct";
import { ParsedInfo } from "../validators";
import { TokenAccount, TokenAccountInfo } from "./token";

export function parseTokenAccountInfo(info: unknown): TokenAccountInfo {
  return create(info, TokenAccountInfo);
  /*
  const routine = () => {
  };
  return onThrowReturnError(routine);
  */
}

export function tryParseAsTokenAccount(data: ParsedAccountData) {
  const routine = () => {
    const info = create(data.parsed, ParsedInfo);

    if (data.program === "spl-token") {
      const parsed = create(info, TokenAccount);
      if (parsed.type === "account") {
        return parseTokenAccountInfo(parsed.info);
      }
    }

    return undefined;
  };

  return onThrowReturnError(routine);
}

function onThrowReturnError<R>(fn: () => R) {
  try {
    return fn();
  } catch (e) {
    return e instanceof Error ? e : new Error(JSON.stringify(e));
  }
}
