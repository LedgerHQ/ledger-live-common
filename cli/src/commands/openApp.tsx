// @flow

import React from "react";
import { Box, render } from "ink";
import { createAction } from "@ledgerhq/live-common/lib/hw/actions/app";
import connectApp from "@ledgerhq/live-common/lib/hw/connectApp";
import DeviceAction from "../DeviceAction";
import { getCryptoCurrencyById } from "@ledgerhq/cryptoassets";
import { Observable } from "rxjs";
import { currencyOpt } from "../scan";

const action = createAction(connectApp);

export default {
  description: "openApp",
  args: [currencyOpt],
  job: (opts: {
    currency: string
  }, ctx, setContext) => new Observable((o) => {
    const instance = render(<Box>
      <DeviceAction
        action={action}
        request={{
          currency: getCryptoCurrencyById(opts.currency||"bitcoin"),
        }}
        onResult={() => {
          instance.unmount()
          o.complete()
        }}
      />
    </Box>)
  })
};
