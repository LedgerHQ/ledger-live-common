// @flow
import { from } from "rxjs";
import { accountFormatters } from "@ledgerhq/live-common/lib/account";
import { scanCommonOpts } from "../scan";
import type { ScanCommonOpts } from "../scan";

export default {
  description: "list accounts",
  args: [...scanCommonOpts],
  job: (opts: ScanCommonOpts & { format: string }, ctx) =>
    from(ctx ? ctx.accounts.map(accountFormatters.head) : []),
};
