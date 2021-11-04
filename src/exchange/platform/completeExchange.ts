import { Observable } from "rxjs";

import type { Transaction } from "../../types";
import type { CompleteExchangeRequestEvent, Exchange } from "./types";

import completeExchangeSwap from "../swap/completeExchange";
import completeExchangeSell from "../sell/completeExchange";

import type { Exchange as ExchangeSwap } from "../swap/types";
import { ExchangeTypes, RateTypes } from "../hw-app-exchange/Exchange";

type CompleteExchangeInput = {
  exchange: Exchange; // FIXME: exchange: ExchangeSwap | ExchangeSell
  deviceId: string;
  provider: string;
  binaryPayload: string;
  signature: string;
  transaction: Transaction;
  exchangeType: number; // FIXME: make a TS enum with available exchange types
  rateType: number; // FIXME: make a TS enum with available rate types
};

// FIXME: trim down input for each flow. exchangeType not needed pass the switch case

const completeExchange = (
  input: CompleteExchangeInput
): Observable<CompleteExchangeRequestEvent> => {
  switch (input.exchangeType) {
    case ExchangeTypes.SWAP:
      if (!input.exchange.toAccount) {
        throw new Error("'toAccount' requested for SWAP exchange");
      }

      return completeExchangeSwap({
        ...input,
        exchange: input.exchange as ExchangeSwap,
      });

    case ExchangeTypes.SELL:
      return completeExchangeSell(input);

    default:
      throw new Error("exchangeType not handled");
  }
};

export default completeExchange;
