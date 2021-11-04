import { Observable } from "rxjs";

import type {
  CompleteExchangeInputSell,
  CompleteExchangeInputSwap,
  CompleteExchangeRequestEvent,
} from "./types";

import completeExchangeSwap from "../swap/completeExchange";
import completeExchangeSell from "../sell/completeExchange";

import { ExchangeTypes } from "../hw-app-exchange/Exchange";

type CompleteExchangeInput =
  | CompleteExchangeInputSell
  | CompleteExchangeInputSwap;

// FIXME: could trim down input for each flow. exchangeType might not needed pass the switch case 🤷‍♂️

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
      return completeExchangeSell(input);

    default:
      throw new Error("exchangeType not handled");
  }
};

export default completeExchange;
