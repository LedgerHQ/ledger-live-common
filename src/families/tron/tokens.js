// @flow

import type { TokenCurrency } from "../../types";
import { getCryptoCurrencyById } from "../../data/cryptocurrencies";
import { addTokens } from "../../data/tokens";
import { trc10HexList } from "../../load/tokens/tron/trc10-name-hex";
import get from "lodash/get";

type TokenType = "trc10" | "trc20";

const convertTokens = (type: TokenType) => ([
  id,
  abbr,
  name,
  contractAddress,
  precision
]): TokenCurrency => {
  const ledgerSignature =
    type === "trc10"
      ? get(
          trc10HexList.find(t => t.id.toString() === id),
          "message",
          undefined
        )
      : undefined;

  return {
    type: "TokenCurrency",
    id: `tron/${type}/${id}`,
    contractAddress,
    parentCurrency: getCryptoCurrencyById("tron"),
    tokenType: type,
    name,
    ticker: abbr,
    delisted: true, // not yet supported
    disableCountervalue: true,
    ledgerSignature,
    units: [
      {
        name,
        code: abbr,
        magnitude: precision
      }
    ]
  };
};

const converters = {
  trc10: convertTokens("trc10"),
  trc20: convertTokens("trc20")
};

export function add(type: TokenType, list: any[]) {
  const converter = converters[type];
  if (!converter) {
    throw new Error("unknown token type '" + type + "'");
  }
  addTokens(list.map(converter));
}
