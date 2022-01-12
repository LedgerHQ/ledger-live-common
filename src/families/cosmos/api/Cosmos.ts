import { getEnv } from "../../../env";
import BigNumber from "bignumber.js";
import network from "../../../network";
import { Operation, SignedOperation } from "../../../types";
import { patchOperationWithHash } from "../../../operation";

const defaultEndpoint = getEnv(
  "API_COSMOS_BLOCKCHAIN_EXPLORER_API_ENDPOINT"
).replace(/\/$/, "");

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
      response.accountNumber = parseInt(data.account.account_number);
    }

    if (data.account.sequence) {
      response.sequence = parseInt(data.account.sequence);
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
  const txs: Array<any> = [];

  const receive = await network({
    method: "GET",
    url:
      `${defaultEndpoint}/cosmos/tx/v1beta1/txs?events=` +
      encodeURI(`transfer.recipient='${address}'`),
  });

  receive.data.tx_responses.forEach((forEach) => txs.push(forEach));

  const send = await network({
    method: "GET",
    url:
      `${defaultEndpoint}/cosmos/tx/v1beta1/txs?events=` +
      encodeURI(`message.sender='${address}'`),
  });

  send.data.tx_responses.forEach((forEach) => txs.push(forEach));

  return txs;
};

export const broadcast = async ({
  signedOperation,
}: {
  signedOperation: SignedOperation;
}): Promise<Operation> => {
  const { operation } = signedOperation;

  const { data } = await network({
    method: "POST",
    url: `${defaultEndpoint}/cosmos/tx/v1beta1/txs`,
    data: {
      tx_bytes: operation.extra.tx_bytes,
      mode: "BROADCAST_MODE_SYNC",
    },
  });

  if (data.tx_response.code != 0) {
    // error codes: https://github.com/cosmos/cosmos-sdk/blob/master/types/errors/errors.go
    throw new Error(
      "invalid broadcast return (code: " +
        (data.tx_response.code || "?") +
        ", message: '" +
        (data.tx_response.raw_log || "") +
        "')"
    );
  }

  return patchOperationWithHash(operation, data.tx_response.txhash);
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

export const simulate = async (tx_bytes: any): Promise<any> => {
  const { data } = await network({
    method: "POST",
    url: `${defaultEndpoint}/cosmos/tx/v1beta1/simulate`,
    data: {
      tx_bytes: tx_bytes,
    },
  });

  return data;
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
