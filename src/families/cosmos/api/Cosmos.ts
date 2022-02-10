import { getEnv } from "../../../env";
import BigNumber from "bignumber.js";
import network from "../../../network";
import { Operation } from "../../../types";
import { patchOperationWithHash } from "../../../operation";

const defaultEndpoint = getEnv(
  "API_COSMOS_BLOCKCHAIN_EXPLORER_API_ENDPOINT"
).replace(/\/$/, "");

export const getAccountInfo = async (address: string): Promise<any> => {
  const [
    { accountNumber, sequence },
    balances,
    blockHeight,
    txs,
    delegations,
    redelegations,
    unbondings,
    withdrawAddress,
  ] = await Promise.all([
    getAccount(address),
    getAllBalances(address),
    getHeight(),
    getTransactions(address),
    getDelegators(address),
    getRedelegations(address),
    getUnbondings(address),
    getWithdrawAddress(address),
  ]);

  return {
    balances,
    blockHeight,
    txs,
    delegations,
    redelegations,
    unbondings,
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

    data.delegation_responses.forEach(async (d) => {
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
        pendingRewards: new BigNumber(0),
        status,
      });
    });

    delegators.forEach(async (d) => {
      try {
        const { data } = await network({
          method: "GET",
          url: `${defaultEndpoint}/cosmos/distribution/v1beta1/delegators/${address}/rewards`,
        });

        data.rewards.forEach((r) => {
          if (r.validator_address === d.validatorAddress) {
            d.pendingRewards = new BigNumber(d.reward.amount).integerValue(
              BigNumber.ROUND_CEIL
            );
          }
        });

        // eslint-disable-next-line no-empty
      } catch (e) {}
    });

    return delegators;
  } catch (e) {
    return [];
  }
};

export const getRedelegations = async (address: string): Promise<any> => {
  const redelegations: Array<any> = [];

  const { data } = await network({
    method: "GET",
    url: `${defaultEndpoint}/cosmos/staking/v1beta1/delegators/${address}/redelegations`,
  });

  data.redelegation_responses.forEach((elem) => {
    elem.entries.forEach((entries) => {
      redelegations.push({
        validatorSrcAddress: elem.validator_src_address,
        validatorDstAddress: elem.validator_dst_address,
        amount: new BigNumber(entries.initial_balance),
        completionDate: new Date(entries.completion_time),
      });
    });
  });

  return redelegations;
};

export const getUnbondings = async (address: string): Promise<any> => {
  const unbondings: Array<any> = [];

  const { data } = await network({
    method: "GET",
    url: `${defaultEndpoint}/cosmos/staking/v1beta1/delegators/${address}/unbonding_delegations`,
  });

  data.unbonding_responses.forEach((elem) => {
    elem.entries.forEach((entries) => {
      unbondings.push({
        validatorAddress: elem.validator_address,
        amount: new BigNumber(entries.initial_balance),
        completionDate: new Date(entries.completion_time),
      });
    });
  });

  return unbondings;
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
  const receive = await network({
    method: "GET",
    url:
      `${defaultEndpoint}/cosmos/tx/v1beta1/txs?events=` +
      encodeURI(`transfer.recipient='${address}'`),
  });

  const send = await network({
    method: "GET",
    url:
      `${defaultEndpoint}/cosmos/tx/v1beta1/txs?events=` +
      encodeURI(`message.sender='${address}'`),
  });

  return [...receive.data.tx_responses, ...send.data.tx_responses];
};

export const broadcast = async ({
  signedOperation: { operation, signature },
}): Promise<Operation> => {
  const { data } = await network({
    method: "POST",
    // url: `${defaultEndpoint}/cosmos/tx/v1beta1/txs`, // FIXME LL-9159
    url: `https://node.atomscan.com/cosmos/tx/v1beta1/txs`,
    data: {
      tx_bytes: Array.from(Uint8Array.from(Buffer.from(signature, "hex"))),
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

export const simulate = async (tx_bytes: Array<any>): Promise<number> => {
  try {
    const { data } = await network({
      method: "POST",
      // url: `${defaultEndpoint}/cosmos/tx/v1beta1/simulate`, // FIXME LL-9159
      url: `https://node.atomscan.com/cosmos/tx/v1beta1/simulate`,
      data: {
        tx_bytes: tx_bytes,
      },
    });

    return data?.gas_info?.gas_used || 0;
  } catch (e) {
    return 0;
  }
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
  const { data } = await network({
    method: "GET",
    url: `${defaultEndpoint}/cosmos/bank/v1beta1/balances/${address}`,
  });

  let amount = new BigNumber(0);

  data.balances.forEach((elem) => {
    amount = amount.plus(elem.amount);
  });

  return amount;
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
