import { create } from "superstruct";
import { TokenAccountInfo } from "../validators/accounts/token";

export function parseTokenAccountInfo(info: unknown): TokenAccountInfo | Error {
  try {
    return create(info, TokenAccountInfo);
  } catch (e) {
    return e instanceof Error ? e : new Error(JSON.stringify(e));
  }
}
