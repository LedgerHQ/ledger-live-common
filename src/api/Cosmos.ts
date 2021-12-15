import { getEnv } from "../env";
import {
  StargateClient,
  SigningStargateClient,
  SignerData,
  StdFee,
} from "@cosmjs/stargate";
import { CosmosClient } from "@cosmjs/launchpad";
import { Tendermint34Client } from "@cosmjs/tendermint-rpc";
import { DecodedTxRaw, decodeTxRaw } from "@cosmjs/proto-signing";
import { fromHex } from "@cosmjs/encoding";
import { log } from "@ledgerhq/logs";
import BigNumber from "bignumber.js";

let api;
let signedApi;
let tmClient;

const defaultEndpoint = getEnv("API_COSMOS_BLOCKCHAIN_EXPLORER_API_ENDPOINT");
const defaultRpcEndpoint = getEnv("API_COSMOS_RPC_URL");

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

export const getTransaction = async (address: string): Promise<any> => {
  log("cosmjs", "fetch transaction");

  try {
    tmClient = await Tendermint34Client.connect(defaultRpcEndpoint);
    const data = await tmClient.tx({ hash: fromHex(address) });

    // fetch date transaction
    const block = await tmClient.block(data.height);
    data.result.date = new Date(block.block.header.time);

    // fetch fee transaction
    data.result.fee = new BigNumber(0);
    const txRaw: DecodedTxRaw = decodeTxRaw(data.result.tx);

    if (txRaw.authInfo.fee) {
      txRaw.authInfo.fee.amount.forEach((fee) => {
        data.result.fee.plus(fee.amount);
      });
    }

    return data.result;
  } catch (e) {
    return undefined;
  }
};

export const getTransactions = async (address: string): Promise<any> => {
  log("cosmjs", "fetch transactions");

  try {
    const txs: Array<any> = [];
    tmClient = await Tendermint34Client.connect(defaultRpcEndpoint);

    const data = await tmClient.txSearch({
      query: `transfer.recipient='${address}'`,
      page: 1,
      per_page: 100,
    });

    for (const tx of data.txs) {
      txs.push(tx);
    }

    // todo: handle pagination to loop over requests

    // fetch date and set default fee
    for (const tx of txs) {
      const block = await tmClient.block(tx.height);
      tx.date = new Date(block.block.header.time);

      tx.fee = new BigNumber(0);
      // todo: fix this, decodeTxRaw break upper iterator
      /*
      const txRaw: DecodedTxRaw = decodeTxRaw(tx.tx);

      if (txRaw.authInfo.fee) {
        txRaw.authInfo.fee.amount.forEach((fee) => {
          tx.fee.plus(fee.amount);
        });
      }
      */
    }

    return txs;
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

export const getBlock = async (height: number): Promise<any> => {
  log("cosmjs", "fetch block");

  try {
    api = await Tendermint34Client.connect(defaultEndpoint);
    const data = await api.block(height);
    return data;
  } catch (e) {
    return undefined;
  }
};

export const getHeight = async (): Promise<number | undefined> => {
  log("cosmjs", "fetch height");

  try {
    api = await new CosmosClient(defaultEndpoint);
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
    api = await StargateClient.connect(defaultRpcEndpoint);
    const data = await api.getBalance(address, searchDenom);
    return data;
  } catch (e) {
    return undefined;
  }
};

export const getAllBalances = async (address: string): Promise<BigNumber> => {
  log("cosmjs", "fetch balances");

  try {
    api = await StargateClient.connect(defaultRpcEndpoint);
    const data = await api.getAllBalances(address);
    return new BigNumber(data[0].amount);
  } catch (e) {
    return new BigNumber(0);
  }
};

export const getChainId = async (): Promise<string | undefined> => {
  log("cosmjs", "fetch chainid");

  try {
    api = await new CosmosClient(defaultEndpoint);
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
