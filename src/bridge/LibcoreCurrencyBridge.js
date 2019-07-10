// @flow

import type { CurrencyBridge } from "../types/bridge";
import { scanAccountsOnDevice } from "../libcore/scanAccountsOnDevice";

const currencyBridge: CurrencyBridge = {
  scanAccountsOnDevice
};

export default currencyBridge;
