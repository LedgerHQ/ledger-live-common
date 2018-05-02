// @flow

import createCounterValues from "@ledgerhq/live-common/lib/countervalues";
import { pairsSelector } from "./reducers/markets";
import { setExchangePairsAction } from "./actions/markets";

export default createCounterValues({
  getAPIBaseURL: () => "https://ledger-countervalue-poc.herokuapp.com",
  storeSelector: state => state.countervalues,
  pairsSelector,
  setExchangePairsAction
});
