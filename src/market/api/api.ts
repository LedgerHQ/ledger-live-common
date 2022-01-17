import {
  MarketListRequestParams,
  MarketCurrencyChartDataRequestParams,
  CurrencyData,
  SupportedCoins,
  MarketCoin,
  SparklineSvgData,
} from "../types";
import {
  listCryptoCurrencies,
  listTokens,
  listSupportedCurrencies,
} from "../../currencies";
import { rangeDataTable } from "../utils/rangeDataTable";
import { CryptoCurrency } from "@ledgerhq/cryptoassets";
import { getEnv } from "../../env";
import network from "../../network";

const cryptoCurrenciesList = [...listCryptoCurrencies(), ...listTokens()];

const supportedCurrencies = listSupportedCurrencies();

const liveCompatibleIds = supportedCurrencies
  .map(({ id }: CryptoCurrency) => id)
  .filter(Boolean);

let LIVE_COINS_LIST: string[] = [];

const ROOT_PATH = getEnv("MARKET_API_URL");

let SUPPORTED_COINS_LIST: SupportedCoins = [];

async function setSupportedCoinsList(): Promise<SupportedCoins> {
  const url = `${ROOT_PATH}/coins/list`;
  const { data } = await network({ method: "GET", url });

  SUPPORTED_COINS_LIST = data;

  LIVE_COINS_LIST = SUPPORTED_COINS_LIST.filter(({ id }) =>
    liveCompatibleIds.includes(id)
  ).map(({ id }) => id);

  return SUPPORTED_COINS_LIST;
}

const matchSearch =
  (search: string) =>
  (currency: MarketCoin): boolean => {
    if (!search) return false;
    const match = `${currency.symbol}|${currency.name}`;
    return match.toLowerCase().includes(search.toLowerCase());
  };

function distributedCopy(items: number[], n: number): number[] {
  const elements = [items[0]];
  const totalItems = items.length - 2;
  const interval = Math.floor(totalItems / (n - 2));
  for (let i = 1; i < n - 1; i++) {
    elements.push(items[i * interval]);
  }
  elements.push(items[items.length - 1]);
  return elements;
}

const sparklineXMagnitude = 5;
const sparklineYHeight = 50;

function sparklineAsSvgData(points: number[]): SparklineSvgData {
  const totalXSteps = sparklineXMagnitude * points.length;
  const min = Math.min(...points);
  const max = Math.max(...points);

  const yOffset = max - min;

  return {
    path: points
      .map((d, i) => {
        const [x, y] = [
          i * sparklineXMagnitude,
          sparklineYHeight + 3 - ((d - min) * sparklineYHeight) / yOffset,
        ];
        return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
      })
      .join(" "),
    viewBox: `0 0 ${totalXSteps} ${sparklineYHeight + 3}`,
  };
}

// fetches currencies data for selected currencies ids
async function listPaginated({
  counterCurrency,
  range = "24h",
  limit = 50,
  page = 1,
  ids: _ids = [],
  starred = [],
  orderBy = "market_cap",
  order = "desc",
  search = "",
  sparkline = true,
  liveCompatible = false,
}: MarketListRequestParams): Promise<CurrencyData[]> {
  let ids = _ids;

  if (liveCompatible) {
    ids = ids.concat(LIVE_COINS_LIST);
  }

  if (starred.length > 0) {
    ids = ids.concat(starred);
  }

  if (search) {
    ids = SUPPORTED_COINS_LIST.filter(matchSearch(search)).map(({ id }) => id);
    if (!ids.length) {
      return [];
    }
  }

  ids = ids.slice((page - 1) * limit, limit * page);

  const url =
    `${ROOT_PATH}/coins/markets?vs_currency=${counterCurrency}&order=${orderBy}_${order}&per_page=${limit}` +
    `&sparkline=${
      sparkline ? "true" : "false"
    }&price_change_percentage=${range}` +
    `${ids.length > 0 ? `&page=1&&ids=${ids.toString()}` : `&page=${page}`}`;

  const { data } = await network({
    method: "GET",
    url,
  });

  return data.map(
    (currency: {
      [x: string]: any;
      id: string;
      name: any;
      image: any;
      ["market_cap"]: any;
      ["market_cap_rank"]: any;
      ["total_volume"]: any;
      ["high_24h"]: any;
      ["low_24h"]: any;
      symbol: any;
      ["current_price"]: any;
      ["market_cap_change_percentage_24h"]: any;
      ["circulating_supply"]: any;
      ["total_supply"]: any;
      ["max_supply"]: any;
      ath: any;
      ["ath_date"]: any;
      atl: any;
      ["atl_date"]: any;
      ["sparkline_in_7d"]: { price: any };
    }) => ({
      id: currency.id,
      name: currency.name,
      image: currency.image,
      isLiveSupported: LIVE_COINS_LIST.includes(currency.id),
      internalCurrency: cryptoCurrenciesList.find(
        ({ ticker }) => ticker.toLowerCase() === currency.symbol
      ),
      marketcap: currency.market_cap,
      marketcapRank: currency.market_cap_rank,
      totalVolume: currency.total_volume,
      high24h: currency.high_24h,
      low24h: currency.low_24h,
      ticker: currency.symbol,
      price: currency.current_price,
      priceChangePercentage:
        currency[`price_change_percentage_${range}_in_currency`],
      marketCapChangePercentage24h: currency.market_cap_change_percentage_24h,
      circulatingSupply: currency.circulating_supply,
      totalSupply: currency.total_supply,
      maxSupply: currency.max_supply,
      ath: currency.ath,
      athDate: currency.ath_date,
      atl: currency.atl,
      atlDate: currency.atl_date,
      sparklineIn7d: currency?.sparkline_in_7d?.price
        ? sparklineAsSvgData(
            distributedCopy(currency.sparkline_in_7d.price, 6 * 7)
          ) // keep 6 points per day
        : null,
      chartData: [],
    })
  );
}

// Fetches list of supported counterCurrencies
async function supportedCounterCurrencies(): Promise<string[]> {
  const url = `${ROOT_PATH}/simple/supported_vs_currencies`;

  const { data } = await network({
    method: "GET",
    url,
  });

  return data;
}

// Fetches list of supported currencies
async function currencyChartData({
  id,
  counterCurrency,
  range = "24h",
}: MarketCurrencyChartDataRequestParams): Promise<{
  [range: string]: number[];
}> {
  const { days, interval } = rangeDataTable[range];
  const url = `${ROOT_PATH}/coins/${id}/market_chart?vs_currency=${counterCurrency}&days=${days}&interval=${interval}`;

  const { data } = await network({
    method: "GET",
    url,
  });

  return { [range]: data.prices };
}

export default {
  setSupportedCoinsList,
  listPaginated,
  supportedCounterCurrencies,
  currencyChartData,
};
