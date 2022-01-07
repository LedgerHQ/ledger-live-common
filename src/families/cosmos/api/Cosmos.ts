import { getEnv } from "../../../env";
import { Tendermint34Client } from "@cosmjs/tendermint-rpc";
import { DecodedTxRaw, decodeTxRaw } from "@cosmjs/proto-signing";
import { toHex } from "@cosmjs/encoding";
import BigNumber from "bignumber.js";
import network from "../../../network";
import { Operation, SignedOperation } from "../../../types";
import { patchOperationWithHash } from "../../../operation";
import { calculateFee, GasPrice } from "@cosmjs/stargate";

let tmClient;

const defaultEndpoint = getEnv(
  "API_COSMOS_BLOCKCHAIN_EXPLORER_API_ENDPOINT"
).replace(/\/$/, "");
const defaultRpcEndpoint = getEnv("API_COSMOS_RPC_URL").replace(/\/$/, "");

export const getAccountInfo = async (address: string) => {
  const [
    { accountNumber, sequence },
    balances,
    blockHeight,
    txs,
    delegations,
    withdrawAddress,
  ] = await Promise.all([
    getAccount(address),
    getAllBalances(address),
    getHeight(),
    getTransactions(address),
    getDelegators(address),
    getWithdrawAddress(address),
  ]);

  return {
    balances,
    blockHeight,
    txs,
    delegations,
    withdrawAddress,
    accountNumber,
    sequence,
  };
};

export const getAccount = async (address: string): Promise<any> => {
  const response = {
    address: address,
    pubkey: null,
    accountNumber: 0,
    sequence: 0,
  };

  try {
    const { data } = await network({
      method: "GET",
      url: `${defaultEndpoint}/cosmos/auth/v1beta1/accounts/${address}`,
    });

    if (data.account.address) {
      response.address = data.account.address;
    }

    if (data.account.account_number) {
      response.accountNumber = data.account.account_number;
    }

    if (data.account.sequence) {
      response.sequence = data.account.sequence;
    }

    // eslint-disable-next-line no-empty
  } catch (e) {}

  return response;
};

export const getDelegators = async (address: string): Promise<any> => {
  const delegators: Array<any> = [];

  try {
    const { data } = await network({
      method: "GET",
      url: `${defaultEndpoint}/cosmos/staking/v1beta1/delegations/${address}`,
    });

    let status = "unbonded";
    const statusMap = {
      BOND_STATUS_UNBONDED: "unbonded",
      BOND_STATUS_UNBONDING: "unbonding",
      BOND_STATUS_BONDED: "bonded",
    };

    for (const d of data.delegation_responses) {
      try {
        const { data } = await network({
          method: "GET",
          url: `${defaultEndpoint}/cosmos/staking/v1beta1/validators/${d.delegation.validator_address}`,
        });

        status = statusMap[data.validator.status] || "unbonded";

        // eslint-disable-next-line no-empty
      } catch (e) {}

      delegators.push({
        validatorAddress: d.delegation.validator_address,
        amount: new BigNumber(d.balance.amount),
        pendingRewards: new BigNumber(d.balance.amount), // todo: ?
        status,
      });
    }

    return delegators;
  } catch (e) {
    return [];
  }
};

export const isValidRecipent = async (address: string): Promise<boolean> => {
  try {
    await network({
      method: "GET",
      url: `${defaultEndpoint}/cosmos/bank/v1beta1/balances/${address}`,
    });

    return true;
  } catch (e) {
    return false;
  }
};

export const getWithdrawAddress = async (address: string): Promise<string> => {
  try {
    const { data } = await network({
      method: "GET",
      url: `${defaultEndpoint}/cosmos/distribution/v1beta1/delegators/${address}/withdraw_address`,
    });

    return data.withdraw_address;
  } catch (e) {
    return "";
  }
};

export const getTransactions = async (address: string): Promise<any> => {
  try {
    const perPage = 100;
    const txs: Array<any> = [];
    tmClient = await Tendermint34Client.connect(defaultRpcEndpoint);

    // fetch incoming transactions
    const txsIn = await tmClient.txSearch({
      query: `transfer.recipient='${address}'`,
      page: 1,
      per_page: perPage,
    });

    for (const tx of txsIn.txs) {
      tx.hash = toHex(tx.hash).toUpperCase();
      txs.push(tx);
    }

    const txsInDone = txs.length;
    const txsInNbPage = Math.ceil((txsIn.totalCount - txsInDone) / perPage);

    // paginate over pages
    for (let i = 2; i <= txsInNbPage; i++) {
      const txsIn = await tmClient.txSearch({
        query: `transfer.recipient='${address}'`,
        page: i,
        per_page: perPage,
      });

      for (const tx of txsIn.txs) {
        tx.hash = toHex(tx.hash).toUpperCase();
        txs.push(tx);
      }
    }

    // fetch outgoing transactions
    const txsOut = await tmClient.txSearch({
      query: `message.sender='${address}'`,
      page: 1,
      per_page: perPage,
    });

    for (const tx of txsOut.txs) {
      tx.hash = toHex(tx.hash).toUpperCase();
      txs.push(tx);
    }

    const txsOutDone = txs.length;
    const txsOutNbPage = Math.ceil((txsOut.totalCount - txsOutDone) / perPage);

    // paginate over pages
    for (let i = 2; i <= txsOutNbPage; i++) {
      const txsOut = await tmClient.txSearch({
        query: `message.sender='${address}'`,
        page: i,
        per_page: perPage,
      });

      for (const tx of txsOut.txs) {
        tx.hash = toHex(tx.hash).toUpperCase();
        txs.push(tx);
      }
    }

    // fetch date and set fees
    for (const tx of txs) {
      const block = await getBlock(tx.height);
      tx.date = new Date(block.block.header.time);
      tx.fee = new BigNumber(0);
      const txRaw: DecodedTxRaw = decodeTxRaw(tx.tx);

      if (txRaw.authInfo.fee) {
        txRaw.authInfo.fee.amount.forEach((fee) => {
          tx.fee = tx.fee.plus(fee.amount);
        });
      }
    }

    return txs;
  } catch (e) {
    return undefined;
  }
};

export const broadcast = async ({
  signedOperation,
}: {
  signedOperation: SignedOperation;
}): Promise<Operation> => {
  const { operation } = signedOperation;

  const { data } = await network({
    method: "POST",
    url: `${defaultEndpoint}/txs`,
    data: {
      tx: operation.extra.tx,
      mode: "commit",
    },
  });

  return patchOperationWithHash(operation, data.hash);
};

export const getBlock = async (height: number): Promise<any> => {
  try {
    const { data } = await network({
      method: "GET",
      url: `${defaultEndpoint}/cosmos/base/tendermint/v1beta1/blocks/${height}`,
    });

    return data;
  } catch (e) {
    return {};
  }
};

export const getFees = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  address?: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  recipient?: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  amount?: number
): Promise<BigNumber> => {
  // todo: handle new cosmjs fee calculation (simulate mode)

  const defaultGasPrice = GasPrice.fromString("0.025ucosm");
  const defaultSendFee = calculateFee(80_000, defaultGasPrice);

  return new BigNumber(defaultSendFee.amount[0].amount);
};

export const getHeight = async (): Promise<number> => {
  try {
    const { data } = await network({
      method: "GET",
      url: `${defaultEndpoint}/cosmos/base/tendermint/v1beta1/blocks/latest`,
    });

    return data.block.header.height;
  } catch (e) {
    return 0;
  }
};

export const getAllBalances = async (address: string): Promise<BigNumber> => {
  try {
    const { data } = await network({
      method: "GET",
      url: `${defaultEndpoint}/cosmos/bank/v1beta1/balances/${address}`,
    });

    // todo:
    // handle correct currency
    // and iterate over multiple
    return new BigNumber(data.balances[0].amount);
  } catch (e) {
    return new BigNumber(0);
  }
};

export const getChainId = async (): Promise<string> => {
  try {
    const { data } = await network({
      method: "GET",
      url: `${defaultEndpoint}/node_info`,
    });

    return data.node_info.network;
  } catch (e) {
    return "";
  }
};

export const getSequence = async (address: string): Promise<number> => {
  try {
    const { data } = await network({
      method: "GET",
      url: `${defaultEndpoint}/cosmos/auth/v1beta1/accounts/${address}`,
    });

    return data.account.sequence;
  } catch (e) {
    return 0;
  }
};

export const getAccountNumber = async (address: string): Promise<number> => {
  try {
    const { data } = await network({
      method: "GET",
      url: `${defaultEndpoint}/cosmos/auth/v1beta1/accounts/${address}`,
    });

    return data.account.account_number;
  } catch (e) {
    return 0;
  }
};
