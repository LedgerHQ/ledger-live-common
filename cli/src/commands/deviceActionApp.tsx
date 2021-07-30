// @flow

import React from "react"
import { map, tap } from "rxjs/operators";
import {Box, render, Text} from "ink"
import { createAction } from "@ledgerhq/live-common/lib/hw/actions/app";
import connectApp from "@ledgerhq/live-common/lib/hw/connectApp";
import { accountFormatters } from "@ledgerhq/live-common/lib/account";
import { scan, scanCommonOpts } from "../scan";
import type { ScanCommonOpts } from "../scan";
import DeviceAction from "../DeviceAction";
import { getCryptoCurrencyById } from "@ledgerhq/cryptoassets";

const action = createAction(connectApp);

export default {
  description: "app device action",
  args: [],
  job: (opts: {}, ctx, setContext) => {
    const instance = render(<Box>
      <DeviceAction
        action={action}
        request={{
          currency: getCryptoCurrencyById("bitcoin"),
        }}
        onResult={() => {
          
          instance.unmount()
        }}
      />
    </Box>)
  }
};
