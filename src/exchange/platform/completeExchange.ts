import { Observable } from "rxjs";

import type {
  CompleteExchangeInputFund,
  CompleteExchangeInputSell,
  CompleteExchangeInputSwap,
  CompleteExchangeRequestEvent,
} from "./types";

import completeExchangeSwap from "../swap/completeExchange";
import completeExchangeTransfer from "./transfer/completeExchange";

import { ExchangeTypes } from "../hw-app-exchange/Exchange";

type CompleteExchangeInput =
  | CompleteExchangeInputSell
  | CompleteExchangeInputSwap
  | CompleteExchangeInputFund;

const completeExchange = (
  input: CompleteExchangeInput
): Observable<CompleteExchangeRequestEvent> => {
  switch (input.exchangeType) {
    case ExchangeTypes.SWAP:
      if (!input.exchange.toAccount) {
        throw new Error("'toAccount' requested for SWAP exchange");
      }

      return completeExchangeSwap(input);

    case ExchangeTypes.SELL:
      return completeExchangeTransfer(input);

    case ExchangeTypes.FUND:
      return completeExchangeTransfer(input);

    default:
      throw new Error("exchangeType not handled");
  }
};

export default completeExchange;
