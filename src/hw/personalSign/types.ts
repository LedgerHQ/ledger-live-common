import Transport from "@ledgerhq/hw-transport";
import type { CryptoCurrency } from "../../types";
export type Result = {
  rsv: {
    r: string;
    s: string;
    v: number;
  };
  signature: string;
};
export type MessageData = {
  currency: CryptoCurrency;
  path: string;
  message: string;
};
export type Resolver = (arg0: Transport, arg1: MessageData) => Promise<Result>;
