// @flow
import type { Account, Operation } from "../../types";
import type { CoreAccount } from "../../libcore/types";
import type { CosmosResources, CoreCosmosLikeAccount } from "./types";
import { BigNumber } from "bignumber.js";
import { log } from "@ledgerhq/logs";
import {
  libcoreAmountToBigNumber,
  libcoreBigIntToBigNumber,
} from "../../libcore/buildBigNumber";
import { promiseAllBatched } from "../../promise";
import { getMaxEstimatedBalance } from "./logic";

// Logic : This function adds the Operation.value of FEES operations
// as Operation.fee of all other operations that match the transaction hash.
// The old FEES operation is not included in the `ops` accumulator
const addCoreOperationToAccountOperations = async (
  accountOpsFeeStore: Promise<{
    ops: { [tx_hash: string]: [Operation] },
    fees: { [tx_hash: string]: string },
  }>,
  newCoreOp: Operation
): Promise<{
  ops: { [tx_hash: string]: [Operation] }, // List of operations matching this transaction hash
  fees: { [tx_hash: string]: BigNumber }, // Value of fees on that transaction hash
}> => {
  let result = await accountOpsFeeStore;
  const id = newCoreOp.id;
  // This split comes from the code in src/families/cosmos/libcore-buildOperation.js
  const txHash = newCoreOp.hash;
  const index = newCoreOp.extra.id;
  if (!(txHash in result.ops)) {
    result.ops[txHash] = [];
  }
  if (index === "fees") {
    result.fees[txHash] = newCoreOp.value;
    for (var i = 0; i < result.ops[txHash].length; i++) {
      result.ops[txHash][i].fee = newCoreOp.value;
    }
  } else {
    const newOpToAdd = newCoreOp;
    if (txHash in result.fees) {
      newOpToAdd.fee = result.fees[txHash];
    }
    result.ops[txHash].push(newOpToAdd);
  }
  return result;
};

const getValidatorStatus = async (
  cosmosAccount: CoreCosmosLikeAccount,
  address
) => {
  const status = ["unbonded", "unbonding", "bonded"];
  const validatorInfo = await cosmosAccount.getValidatorInfo(address);
  return status[await validatorInfo.getActiveStatus()];
};

const getFlattenDelegation = async (cosmosAccount) => {
  const delegations = await cosmosAccount.getDelegations();
  const pendingRewards = await cosmosAccount.getPendingRewards();

  return await promiseAllBatched(10, delegations, async (delegation) => {
    const validatorAddress = await delegation.getValidatorAddress();

    let reward;
    for (let i = 0; i < pendingRewards.length; i++) {
      if (
        (await pendingRewards[i].getValidatorAddress()) === validatorAddress
      ) {
        reward = await pendingRewards[i].getRewardAmount();
        break;
      }
    }

    return {
      amount: await libcoreAmountToBigNumber(
        await delegation.getDelegatedAmount()
      ),
      validatorAddress,
      pendingRewards: reward
        ? await libcoreAmountToBigNumber(reward)
        : BigNumber(0),
      status: await getValidatorStatus(cosmosAccount, validatorAddress),
    };
  });
};

const getFlattenRedelegations = async (cosmosAccount) => {
  const redelegations = await cosmosAccount.getRedelegations();

  const toFlatten = await promiseAllBatched(
    3,
    redelegations,
    async (redelegation) =>
      await promiseAllBatched(
        3,
        await redelegation.getEntries(),
        async (entry) => ({
          validatorSrcAddress: await redelegation.getSrcValidatorAddress(),
          validatorDstAddress: await redelegation.getDstValidatorAddress(),
          amount: await libcoreBigIntToBigNumber(
            await entry.getInitialBalance()
          ),
          completionDate: await entry.getCompletionTime(),
        })
      )
  );

  return toFlatten.reduce((old, current) => [...old, ...current], []);
};

const getFlattenUnbonding = async (cosmosAccount) => {
  const unbondings = await cosmosAccount.getUnbondings();

  const toFlatten = await promiseAllBatched(
    3,
    unbondings,
    async (unbonding) =>
      await promiseAllBatched(
        3,
        await unbonding.getEntries(),
        async (entry) => ({
          validatorAddress: await unbonding.getValidatorAddress(),
          amount: await libcoreBigIntToBigNumber(
            await entry.getInitialBalance()
          ),
          completionDate: await entry.getCompletionTime(),
        })
      )
  );

  return toFlatten.reduce((old, current) => [...old, ...current], []);
};

const getCosmosResources = async (
  account: Account,
  coreAccount
): Promise<CosmosResources> => {
  const cosmosAccount = await coreAccount.asCosmosLikeAccount();
  const flattenDelegation = await getFlattenDelegation(cosmosAccount);
  const flattenUnbonding = await getFlattenUnbonding(cosmosAccount);
  const flattenRedelegation = await getFlattenRedelegations(cosmosAccount);
  const res = {
    delegations: flattenDelegation,
    redelegations: flattenRedelegation,
    unbondings: flattenUnbonding,
    delegatedBalance: flattenDelegation.reduce(
      (old, current) => old.plus(current.amount),
      BigNumber(0)
    ),
    pendingRewardsBalance: flattenDelegation.reduce(
      (old, current) => old.plus(current.pendingRewards),
      BigNumber(0)
    ),
    unbondingBalance: flattenUnbonding.reduce(
      (old, current) => old.plus(current.amount),
      BigNumber(0)
    ),
    withdrawAddress: "",
  };

  return res;
};

const postBuildAccount = async ({
  account,
  coreAccount,
}: {
  account: Account,
  coreAccount: CoreAccount,
}): Promise<Account> => {
  log("cosmos/post-buildAccount", "getCosmosResources");
  account.cosmosResources = await getCosmosResources(account, coreAccount);
  log("cosmos/post-buildAccount", "getCosmosResources DONE");
  account.spendableBalance = getMaxEstimatedBalance(account, BigNumber(0));
  if (account.spendableBalance.lt(0)) {
    account.spendableBalance = BigNumber(0);
  }
  account.operations = await account.operations
    .reduce(
      addCoreOperationToAccountOperations,
      Promise.resolve({ ops: {}, fees: {} })
    )
    .then((res) => {
      return [].concat.apply([], Object.values(res.ops));
    });
  return account;
};

export default postBuildAccount;
