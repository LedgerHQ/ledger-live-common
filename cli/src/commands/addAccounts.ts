// @flow

import { map, tap } from "rxjs/operators";
import { accountFormatters } from "@ledgerhq/live-common/lib/account";
import { scan, scanCommonOpts } from "../scan";
import type { ScanCommonOpts } from "../scan";

export default {
  description: "Add accounts",
  args: [...scanCommonOpts],
  job: (opts: ScanCommonOpts & { format: string }, _ctx, setContext) =>
    scan(opts).pipe(
      tap(
        (account) =>
          setContext &&
          setContext((ctx) => ({
            accounts: ctx.accounts.concat([account]),
          }))
      ),
      map(accountFormatters.head)
    ),
};
