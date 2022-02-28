import { BigNumber } from "bignumber.js";
import { getEnv } from "../env";
import network from "../network";
import { parseCurrencyUnit, getCryptoCurrencyById } from "../currencies";

const defaultEndpoint = () => getEnv("API_RIPPLE_RPC");

export const connectionTimeout = 30 * 1000; // default connectionTimeout is 2s and make the specs bot failed

const rippleUnit = getCryptoCurrencyById("ripple").units[0];

export const parseAPIValue = (value: string): BigNumber =>
  parseCurrencyUnit(rippleUnit, value);

export const submit = async (signature: string): Promise<any> => {
  const res = await network({
    method: "POST",
    url: `${defaultEndpoint()}`,
    data: {
      method: "submit",
      params: [
        {
          tx_blob: signature,
        },
      ],
    },
  });
  return res.data.result;
};

export const getAccountInfo = async (recipient: string): Promise<any> => {
  const res = await network({
    method: "POST",
    url: `${defaultEndpoint()}`,
    data: {
      method: "account_info",
      params: [
        {
          account: recipient,
          ledger_index: "validated",
        },
      ],
    },
  });
  return res.data.result;
};

export const getServerInfo = async (
  endpointConfig?: string | null | undefined
): Promise<any> => {
  const res = await network({
    method: "POST",
    url: endpointConfig ?? `${defaultEndpoint()}`,
    data: {
      method: "server_info",
      params: [
        {
          ledger_index: "validated",
        },
      ],
    },
  });

  return res.data.result;
};

export const getTransactions = async (
  address: string,
  options: any | undefined
): Promise<any> => {
  const res = await network({
    method: "POST",
    url: `${defaultEndpoint()}`,
    data: {
      method: "account_tx",
      params: [
        {
          account: address,
          ledger_index: "validated",
          ...options,
        },
      ],
    },
  });
  return res.data.result;
};
