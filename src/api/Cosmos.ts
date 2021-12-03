import { getEnv } from "../env";
import {
  StargateClient,
  SigningStargateClient,
  SignerData,
  StdFee,
} from "@cosmjs/stargate";
import { fromHex } from "@cosmjs/encoding";
import { log } from "@ledgerhq/logs";
import BigNumber from "bignumber.js";

let api;
let signedApi;

const defaultEndpoint = getEnv("API_COSMOS_RPC_URL");

export const getAccountInfo = async (
  recipient: string
): Promise<unknown | undefined> => {
  log("cosmjs", "fetch account information");

  try {
    api = await StargateClient.connect(defaultEndpoint);
    const data = await api.getAccount(recipient);
    return data;
  } catch (e) {
    return undefined;
  }
};

export const getTransactions = async (address: string): Promise<undefined> => {
  log("cosmjs", "fetch transaction");

  try {
    api = await StargateClient.connect(defaultEndpoint);
    const data = await api.getTx(address);
    return data;
  } catch (e) {
    return undefined;
  }
};

export const broadcast = async (
  transaction: string
): Promise<number | undefined> => {
  log("cosmjs", "fetch broadcast");

  try {
    api = await StargateClient.connect(defaultEndpoint);
    const data = await api.broadcastTx(fromHex(transaction));
    return data;
  } catch (e) {
    return undefined;
  }
};

export const getBlock = async (height: number): Promise<number | undefined> => {
  log("cosmjs", "fetch block");

  try {
    api = await StargateClient.connect(defaultEndpoint);
    const data = await api.getBlock(height);
    return data;
  } catch (e) {
    return undefined;
  }
};

export const getHeight = async (): Promise<number | undefined> => {
  log("cosmjs", "fetch height");

  try {
    api = await StargateClient.connect(defaultEndpoint);
    const data = await api.getHeight();
    return data;
  } catch (e) {
    return undefined;
  }
};

export const getBalance = async (
  address: string,
  searchDenom: string
): Promise<BigNumber | undefined> => {
  log("cosmjs", "fetch balance");

  try {
    api = await StargateClient.connect(defaultEndpoint);
    const data = await api.getBalance(address, searchDenom);
    return data;
  } catch (e) {
    return undefined;
  }
};

export const getAllBalances = async (
  address: string
): Promise<BigNumber | undefined> => {
  log("cosmjs", "fetch balances");

  try {
    api = await StargateClient.connect(defaultEndpoint);
    const data = await api.getAllBalances(address);
    return data[0].amount;
  } catch (e) {
    return undefined;
  }
};

export const getChainId = async (): Promise<string | undefined> => {
  log("cosmjs", "fetch chainid");

  try {
    api = await StargateClient.connect(defaultEndpoint);
    const data = await api.getChainId();
    return data;
  } catch (e) {
    return undefined;
  }
};

export const sign = async (
  signerAddress: string,
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  messages,
  fee: StdFee,
  memo: string,
  explicitSignerData: SignerData | undefined
): Promise<string | undefined> => {
  log("cosmjs", "sign");

  try {
    signedApi = await SigningStargateClient.connect(defaultEndpoint);
    const data = await signedApi.sign(
      signerAddress,
      messages,
      fee,
      memo,
      explicitSignerData
    );
    return data;
  } catch (e) {
    return undefined;
  }
};

export const signAndBroadcast = async (
  signerAddress: string,
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  messages,
  fee: StdFee,
  memo: string
): Promise<string | undefined> => {
  log("cosmjs", "sign and broadcast");

  try {
    signedApi = await SigningStargateClient.connect(defaultEndpoint);
    const data = await signedApi.signAndBroadcast(
      signerAddress,
      messages,
      fee,
      memo
    );
    return data;
  } catch (e) {
    return undefined;
  }
};

export const getSequence = async (
  address: string
): Promise<string | undefined> => {
  log("cosmjs", "fetch sequence");

  try {
    signedApi = await SigningStargateClient.connect(defaultEndpoint);
    const data = await signedApi.getSequence(address);
    return data;
  } catch (e) {
    return undefined;
  }
};
