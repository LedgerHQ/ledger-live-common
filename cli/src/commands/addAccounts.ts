// @flow

import { map, tap } from "rxjs/operators";
import { accountFormatters } from "@ledgerhq/live-common/lib/account";
import { scan, scanCommonOpts } from "../scan";
import type { ScanCommonOpts } from "../scan";

export default {
  description: "Add accounts",
  args: [...scanCommonOpts],
  job: (opts: ScanCommonOpts & { format: string }, ctx, setContext) =>
    scan(opts).pipe(
      map(account => ({
        ...account,
        name: "["+ctx.accounts.length+"] "+account.name
      })),
      tap(
        (account) =>
          setContext &&
          setContext((ctx) => 
            ctx.accounts.some(a => a.id === account.id) ? {} :
          ({ accounts: ctx.accounts.concat([account]) }))
      ),
      map(accountFormatters.head)
    ),
};
