import ethereum from "./ethereum";
import { Resolver } from "./types";
// TODO deprecate this approach
const all = {
  ethereum
};

const m: Resolver = (transport, opts) => {
  const r = all[opts.currency.id];
  if (r) return r(transport, opts);
  throw new Error(`unsupported signTransaction(${opts.currency.id})`);
};

export default m;
