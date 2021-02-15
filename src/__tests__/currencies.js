//@flow

import { BigNumber } from "bignumber.js";
import {
  sortByMarketcap,
  listTokens,
  listCryptoCurrencies,
  getCryptoCurrencyById,
  getFiatCurrencyByTicker,
  formatCurrencyUnit,
  parseCurrencyUnit,
  chopCurrencyUnitDecimals,
  formatShort,
  decodeURIScheme,
  encodeURIScheme,
  sanitizeValueString,
} from "../currencies";
import { byContractAddress } from "@ledgerhq/hw-app-eth/erc20";

test("erc20 are all consistent with those on ledgerjs side", () => {
  const normalList = listTokens();
  const delistedList = listTokens({ withDelisted: true });
  expect(delistedList.length).toBeGreaterThan(normalList.length);
  for (const token of delistedList) {
    if (token.delisted) {
      expect(normalList.find((o) => o.id === token.id)).toBeUndefined();
    }
    if (token.tokenType === "erc20") {
      const tokenData = byContractAddress(token.contractAddress);
      if (!tokenData) {
        throw new Error(token.name + " not available in ledgerjs data");
      }
      expect(token.ticker.toLowerCase()).toBe(tokenData.ticker.toLowerCase());
      expect(token.contractAddress.toLowerCase()).toBe(
        tokenData.contractAddress.toLowerCase()
      );
      expect(token.units[0].magnitude).toBe(tokenData.decimals);
    }
  }
});

test("sort by marketcap", () => {
  const tokens = listTokens().filter(
    (t) => t.ticker === "XST" || t.ticker === "ZRX" || t.ticker === "HOT"
  );
  const currencies = listCryptoCurrencies().filter(
    (c) => c.ticker === "BTC" || c.ticker === "XST" || c.ticker === "ETH"
  );
  expect(
    sortByMarketcap(currencies.concat(tokens), [
      "BTC",
      "ETH",
      "ZRX",
      "HOT",
      "XST",
    ]).map((c) => c.id)
  ).toMatchObject([
    "bitcoin",
    "ethereum",
    "ethereum/erc20/0x_project",
    "ethereum/erc20/holotoken",
    "stealthcoin",
    "ethereum/erc20/hydro_protocol",
    "ethereum/erc20/xensor",
  ]);
});

test("can format a currency unit", () => {
  const btc = getCryptoCurrencyById("bitcoin").units[0];
  expect(formatCurrencyUnit(btc, BigNumber(100000000))).toBe("1");
  expect(
    formatCurrencyUnit(btc, BigNumber(1000000), {
      showCode: true,
    })
  ).toBe("0.01 BTC");
  expect(
    formatCurrencyUnit(btc, BigNumber(100000000), {
      showCode: true,
    })
  ).toBe("1 BTC");
  expect(
    formatCurrencyUnit(btc, BigNumber(100000000), {
      showCode: true,
      showAllDigits: true,
    })
  ).toBe("1.00000000 BTC");
  expect(
    formatCurrencyUnit(btc, BigNumber(100000000), {
      showCode: true,
      showAllDigits: true,
      alwaysShowSign: true,
    })
  ).toBe("+1.00000000 BTC");
});

test("do not consider 'showAllDigits: undefined' as false", () => {
  expect(
    formatCurrencyUnit(
      getFiatCurrencyByTicker("USD").units[0],
      BigNumber(-1234500),
      {
        showCode: true,
        showAllDigits: undefined,
      }
    )
  ).toBe("-$12,345.00");
});

test("can enable discreet mode", () => {
  const btc = getCryptoCurrencyById("bitcoin").units[0];
  expect(
    formatCurrencyUnit(btc, BigNumber(100000000), { discreet: true })
  ).toBe("***");
  expect(
    formatCurrencyUnit(btc, BigNumber(1000000), {
      discreet: true,
      showCode: true,
    })
  ).toBe("*** BTC");
  expect(
    formatCurrencyUnit(btc, BigNumber(100000000), {
      discreet: true,
      showCode: true,
    })
  ).toBe("*** BTC");
  expect(
    formatCurrencyUnit(btc, BigNumber(100000000), {
      discreet: true,
      showCode: true,
      showAllDigits: true,
    })
  ).toBe("*** BTC");
  expect(
    formatCurrencyUnit(btc, BigNumber(100000000), {
      discreet: true,
      showCode: true,
      showAllDigits: true,
      alwaysShowSign: true,
    })
  ).toBe("+*** BTC");
});

test("formatter will floor values by default", () => {
  expect(
    formatCurrencyUnit(
      getCryptoCurrencyById("bitcoin").units[0],
      BigNumber(1000001),
      {}
    )
  ).toBe("0.01");
  expect(
    formatCurrencyUnit(
      getCryptoCurrencyById("bitcoin").units[0],
      BigNumber(1000010)
    )
  ).toBe("0.01");
  expect(
    formatCurrencyUnit(
      getCryptoCurrencyById("bitcoin").units[0],
      BigNumber(1000100)
    )
  ).toBe("0.010001");
  expect(
    formatCurrencyUnit(
      getCryptoCurrencyById("bitcoin").units[0],
      BigNumber("999999999999")
    )
  ).toBe("9,999");
});

test("formatter rounding can be disabled", () => {
  expect(
    formatCurrencyUnit(
      getCryptoCurrencyById("bitcoin").units[0],
      BigNumber("999999999999"),
      {
        disableRounding: true,
      }
    )
  ).toBe("9,999.99999999");
});

test("sub magnitude", () => {
  expect(
    formatCurrencyUnit(
      getFiatCurrencyByTicker("USD").units[0],
      BigNumber(0.04),
      {
        subMagnitude: 2,
      }
    )
  ).toBe("0.0004");

  // digits will be round after subMagnitude
  expect(
    formatCurrencyUnit(
      getFiatCurrencyByTicker("USD").units[0],
      BigNumber(0.03987654),
      {
        subMagnitude: 2,
        showCode: true,
      }
    )
  ).toBe("$0.0003");

  expect(
    formatCurrencyUnit(
      getFiatCurrencyByTicker("USD").units[0],
      BigNumber(0.03987654),
      {
        subMagnitude: 2,
        disableRounding: true,
      }
    )
  ).toBe("0.0003");

  expect(
    formatCurrencyUnit(
      getFiatCurrencyByTicker("USD").units[0],
      BigNumber(0.03987654),
      {
        subMagnitude: 5,
        disableRounding: true,
      }
    )
  ).toBe("0.0003987");

  // even tho the USD unit showAllDigits, it does not force the sub magnitude digits to show
  expect(
    formatCurrencyUnit(
      getFiatCurrencyByTicker("USD").units[0],
      BigNumber(0.03),
      {
        subMagnitude: 5,
        disableRounding: true,
      }
    )
  ).toBe("0.0003");

  expect(
    formatCurrencyUnit(
      getCryptoCurrencyById("bitcoin").units[0],
      BigNumber(9.123456),
      {
        subMagnitude: 2,
        disableRounding: true,
      }
    )
  ).toBe("0.0000000912");
  expect(
    formatCurrencyUnit(
      getCryptoCurrencyById("bitcoin").units[0],
      BigNumber("999999999999.123456"),
      {
        disableRounding: true,
        subMagnitude: 2,
      }
    )
  ).toBe("9,999.9999999912");
  expect(
    formatCurrencyUnit(
      getCryptoCurrencyById("bitcoin").units[0],
      BigNumber("999999999999.123456"),
      {
        subMagnitude: 2,
      }
    )
  ).toBe("9,999");
});

test("parseCurrencyUnit", () => {
  expect(
    parseCurrencyUnit(
      getCryptoCurrencyById("bitcoin").units[0],
      "9999.99999999"
    ).toNumber()
  ).toBe(999999999999);
  expect(
    parseCurrencyUnit(
      getCryptoCurrencyById("bitcoin").units[0],
      ".987654"
    ).toNumber()
  ).toBe(98765400);
  expect(
    parseCurrencyUnit(
      getCryptoCurrencyById("bitcoin").units[0],
      "9999"
    ).toNumber()
  ).toBe(999900000000);
  expect(
    parseCurrencyUnit(getCryptoCurrencyById("bitcoin").units[0], "1").toNumber()
  ).toBe(100000000);
  /*expect(
    parseCurrencyUnit(getCryptoCurrencyById("bitcoin").units[0], "0x1").toNumber()
  ).toBe(0);*/
  expect(
    parseCurrencyUnit(
      getCryptoCurrencyById("bitcoin").units[0],
      "NOPE"
    ).toNumber()
  ).toBe(0);
});

test("formatter works with fiats", () => {
  expect(
    formatCurrencyUnit(
      getFiatCurrencyByTicker("EUR").units[0],
      BigNumber(12345),
      {
        showCode: true,
      }
    )
  ).toBe("€123.45");
  // by default, fiats always show the digits
  expect(
    formatCurrencyUnit(
      getFiatCurrencyByTicker("EUR").units[0],
      BigNumber(12300)
    )
  ).toBe("123.00");
});

test("formatter useGrouping", () => {
  expect(
    formatCurrencyUnit(
      getFiatCurrencyByTicker("EUR").units[0],
      BigNumber(1234500),
      {
        useGrouping: true,
      }
    )
  ).toBe("12,345.00");
  expect(
    formatCurrencyUnit(
      getFiatCurrencyByTicker("EUR").units[0],
      BigNumber(1234500),
      {
        useGrouping: false,
      }
    )
  ).toBe("12345.00");
});

test("formatter can change locale", () => {
  expect(
    formatCurrencyUnit(
      getFiatCurrencyByTicker("USD").units[0],
      BigNumber(-1234567),
      {
        showCode: true,
      }
    )
  ).toBe("-$12,345.67");
});

test("formatter does not show very small value in rounding mode", () => {
  expect(
    formatCurrencyUnit(getCryptoCurrencyById("ethereum").units[0], BigNumber(1))
  ).toBe("0");
  expect(
    formatCurrencyUnit(
      getCryptoCurrencyById("ethereum").units[0],
      BigNumber(1000)
    )
  ).toBe("0");
});

test("formatShort", () => {
  expect(
    formatShort(getFiatCurrencyByTicker("EUR").units[0], BigNumber(123456789))
  ).toBe("1.2m");
  expect(
    formatShort(getFiatCurrencyByTicker("EUR").units[0], BigNumber(123456))
  ).toBe("1.2k");

  expect(
    formatShort(getCryptoCurrencyById("ethereum").units[0], BigNumber(600000))
  ).toBe("0");
});

test("chopCurrencyUnitDecimals", () => {
  expect(
    chopCurrencyUnitDecimals(getFiatCurrencyByTicker("EUR").units[0], "1")
  ).toBe("1");
  expect(
    chopCurrencyUnitDecimals(getFiatCurrencyByTicker("EUR").units[0], "1234")
  ).toBe("1234");
  expect(
    chopCurrencyUnitDecimals(getFiatCurrencyByTicker("EUR").units[0], "1234.56")
  ).toBe("1234.56");
  expect(
    chopCurrencyUnitDecimals(
      getFiatCurrencyByTicker("EUR").units[0],
      "1234.5678"
    )
  ).toBe("1234.56");
  expect(
    chopCurrencyUnitDecimals(
      getFiatCurrencyByTicker("EUR").units[0],
      "1234.5678 EUR"
    )
  ).toBe("1234.56 EUR");
});

test("encodeURIScheme", () => {
  expect(
    encodeURIScheme({
      currency: getCryptoCurrencyById("bitcoin"),
      address: "1gre1noAY9HiK2qxoW8FzSdjdFBcoZ5fV",
    })
  ).toBe("bitcoin:1gre1noAY9HiK2qxoW8FzSdjdFBcoZ5fV");

  expect(
    encodeURIScheme({
      currency: getCryptoCurrencyById("bitcoin"),
      address: "1gre1noAY9HiK2qxoW8FzSdjdFBcoZ5fV",
      amount: BigNumber("1234567000000"),
    })
  ).toBe("bitcoin:1gre1noAY9HiK2qxoW8FzSdjdFBcoZ5fV?amount=12345.67");
});

test("decodeURIScheme", () => {
  expect(
    decodeURIScheme("bitcoin:1gre1noAY9HiK2qxoW8FzSdjdFBcoZ5fV")
  ).toMatchObject({
    currency: getCryptoCurrencyById("bitcoin"),
    address: "1gre1noAY9HiK2qxoW8FzSdjdFBcoZ5fV",
  });

  expect(
    decodeURIScheme("bitcoin:1gre1noAY9HiK2qxoW8FzSdjdFBcoZ5fV?amount=12345.67")
  ).toMatchObject({
    currency: getCryptoCurrencyById("bitcoin"),
    address: "1gre1noAY9HiK2qxoW8FzSdjdFBcoZ5fV",
    amount: BigNumber("1234567000000"),
  });

  expect(
    decodeURIScheme(
      "ethereum:0x931d387731bbbc988b312206c74f77d004d6b84b?gas=100&gasPrice=200&value=" +
        10 ** 18
    )
  ).toMatchObject({
    currency: getCryptoCurrencyById("ethereum"),
    address: "0x931d387731bbbc988b312206c74f77d004d6b84b",
    amount: BigNumber(10 ** 18),
    userGasLimit: BigNumber(100),
    gasPrice: BigNumber(200),
  });

  expect(
    decodeURIScheme(
      "ethereum:0x931d387731bbbc988b312206c74f77d004d6b84b?gas=-1&gasPrice=-1&value=-1"
    )
  ).toMatchObject({
    currency: getCryptoCurrencyById("ethereum"),
    address: "0x931d387731bbbc988b312206c74f77d004d6b84b",
    amount: BigNumber(0),
    userGasLimit: BigNumber(0),
    gasPrice: BigNumber(0),
  });

  expect(
    decodeURIScheme(
      "ethereum:0x072b04a9b047C3c7a2A455FFF5264D785e6E55C9?amount=0.0647&gasPrice=77000000000"
    )
  ).toMatchObject({
    currency: getCryptoCurrencyById("ethereum"),
    address: "0x072b04a9b047C3c7a2A455FFF5264D785e6E55C9",
    amount: BigNumber(0.0647).times(10 ** 18),
    gasPrice: BigNumber(77000000000),
  });
});

test("sanitizeValueString", () => {
  const bitcoin = getCryptoCurrencyById("bitcoin");
  const btcUnit = bitcoin.units[0];
  const satUnit = bitcoin.units[bitcoin.units.length - 1];
  expect(sanitizeValueString(btcUnit, "")).toMatchObject({
    display: "",
  });
  expect(sanitizeValueString(btcUnit, "123456")).toMatchObject({
    display: "123456",
    value: "12345600000000",
  });
  expect(sanitizeValueString(btcUnit, "1")).toMatchObject({
    display: "1",
    value: "100000000",
  });
  expect(sanitizeValueString(btcUnit, "1.00")).toMatchObject({
    display: "1.00",
    value: "100000000",
  });
  expect(sanitizeValueString(btcUnit, ".00")).toMatchObject({
    display: "0.00",
  });
  expect(sanitizeValueString(btcUnit, ".1")).toMatchObject({
    display: "0.1",
  });
  expect(sanitizeValueString(btcUnit, ".123456789")).toMatchObject({
    display: "0.12345678",
  });
  expect(sanitizeValueString(btcUnit, "1ab")).toMatchObject({
    display: "1",
  });
  expect(sanitizeValueString(btcUnit, "1,3")).toMatchObject({
    display: "1.3",
  });
  expect(sanitizeValueString(btcUnit, "1 300")).toMatchObject({
    display: "1300",
  });
  expect(sanitizeValueString(btcUnit, "13.")).toMatchObject({
    display: "13.",
    value: "1300000000",
  });
  expect(sanitizeValueString(satUnit, "13.")).toMatchObject({
    display: "13",
    value: "13",
  });
  expect(sanitizeValueString(btcUnit, "000.12345678")).toMatchObject({
    display: "0.12345678",
    value: "12345678",
  });
  expect(sanitizeValueString(btcUnit, "001.23456789")).toMatchObject({
    display: "1.23456789",
    value: "123456789",
  });
});
