import { getEnv } from "../env";
import {
  StargateClient,
  SigningStargateClient,
  SignerData,
  StdFee,
  calculateFee,
  GasPrice,
  Coin,
} from "@cosmjs/stargate";
import { CosmosClient } from "@cosmjs/launchpad";
import { Tendermint34Client } from "@cosmjs/tendermint-rpc";
import { Secp256k1HdWallet } from "@cosmjs/launchpad";
//import { DecodedTxRaw, decodeTxRaw } from "@cosmjs/proto-signing";
import { fromHex, toHex } from "@cosmjs/encoding";
import { log } from "@ledgerhq/logs";
import BigNumber from "bignumber.js";

let api;
let signedApi;
let tmClient;

const defaultEndpoint = getEnv("API_COSMOS_BLOCKCHAIN_EXPLORER_API_ENDPOINT");
const defaultRpcEndpoint = getEnv("API_COSMOS_RPC_URL");

export const getTransactions = async (address: string): Promise<any> => {
  log("cosmjs", "fetch transactions");

  try {
    const perPage = 100;
    const txs: { [id: string]: any } = {};
    const data: Array<any> = [];
    tmClient = await Tendermint34Client.connect(defaultRpcEndpoint);

    // fetch incoming transactions
    const txsIn = await tmClient.txSearch({
      query: `transfer.recipient='${address}'`,
      page: 1,
      per_page: perPage,
      order_by: "desc",
    });

    for (const tx of txsIn.txs) {
      tx.hash = toHex(tx.hash).toUpperCase();
      data.push(tx);
    }

    const txsInDone = txs.length;
    const txsInNbPage = Math.ceil((txsIn.totalCount - txsInDone) / perPage);

    // paginate over pages
    for (let i = 2; i <= txsInNbPage; i++) {
      const txsIn = await tmClient.txSearch({
        query: `transfer.recipient='${address}'`,
        page: i,
        per_page: perPage,
        order_by: "desc",
      });

      for (const tx of txsIn.txs) {
        tx.hash = toHex(tx.hash).toUpperCase();
        data.push(tx);
      }
    }

    // fetch outgoing transactions
    const txsOut = await tmClient.txSearch({
      query: `message.sender='${address}'`,
      page: 1,
      per_page: perPage,
      order_by: "desc",
    });

    for (const tx of txsOut.txs) {
      tx.hash = toHex(tx.hash).toUpperCase();
      data.push(tx);
    }

    const txsOutDone = txs.length;
    const txsOutNbPage = Math.ceil((txsOut.totalCount - txsOutDone) / perPage);

    // paginate over pages
    for (let i = 2; i <= txsOutNbPage; i++) {
      const txsOut = await tmClient.txSearch({
        query: `message.sender='${address}'`,
        page: i,
        per_page: perPage,
        order_by: "desc",
      });

      for (const tx of txsOut.txs) {
        tx.hash = toHex(tx.hash).toUpperCase();
        data.push(tx);
      }
    }

    // fetch date and set fees
    for (const tx of data) {
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

    // sort transactions by date
    data.sort((a, b) => {
      return b.date.getTime() - a.date.getTime();
    });

    for (const tx of data) {
      txs[tx.hash] = tx;
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

export const getFees = async (
  // address: string,
  // recipient: string,
  // amount: number
): Promise<BigNumber> => {
  log("cosmjs", "look for fees price");

  // todo: handle new cosmjs fee calculation (simulate mode)

  const defaultGasPrice = GasPrice.fromString("0.025ucosm");
  const defaultSendFee = calculateFee(80_000, defaultGasPrice);

  return new BigNumber(defaultSendFee.amount[0].amount);
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

export const getAllBalances = async (
  address: string
): Promise<BigNumber | undefined> => {
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
