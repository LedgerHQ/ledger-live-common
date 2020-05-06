// @flow
import type { Account } from "../../types";
import type { CoreAccount } from "../../libcore/types";
import type { CosmosResources, CoreCosmosLikeAccount } from "./types";
import { BigNumber } from "bignumber.js";
import {
  libcoreAmountToBigNumber,
  libcoreBigIntToBigNumber
} from "../../libcore/buildBigNumber";

const getValidatorStatus = async (
  cosmosAccount: CoreCosmosLikeAccount,
  address
) => {
  const status = ["unbonded", "unbonding", "bonded"];
  const validatorInfo = await cosmosAccount.getValidatorInfo(address);

  return status[validatorInfo.activeStatus];
};

const getFlattenDelegation = async cosmosAccount => {
  const delegations = await cosmosAccount.getDelegations();

  return await Promise.all(
    delegations.map(async delegation => {
      const validatorAddress = await delegation.getValidatorAddress();
      const pendingRewards = await cosmosAccount.getPendingRewards();

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
        status: await getValidatorStatus(
          cosmosAccount,
          await delegation.getValidatorAddress()
        )
      };
    })
  );
};

const getFlattenRedelegations = async cosmosAccount => {
  const redelegations = await cosmosAccount.getRedelegations();

  return redelegations.reduce(async (old, redelegation) => {
    const collection = await old;
    const entries = await Promise.all(
      (await redelegation.getEntries()).map(async entry => {
        return {
          validatorSrcAddress: await redelegation.getSrcValidatorAddress(),
          validatorDstAddress: await redelegation.getDstValidatorAddress(),
          amount: await libcoreBigIntToBigNumber(
            await entry.getInitialBalance()
          ),
          completionDate: await entry.getCompletionTime()
        };
      })
    );
    return [...collection, ...entries];
  }, Promise.resolve([]));
};

const getFlattenUnbonding = async cosmosAccount => {
  const unboundings = await cosmosAccount.getUnbondings();

  return unboundings.reduce(async (old, unbounding) => {
    const collection = await old;
    const entries = await Promise.all(
      (await unbounding.getEntries()).map(async entry => {
        return {
          validatorAddress: await unbounding.getValidatorAddress(),
          amount: await libcoreBigIntToBigNumber(
            await entry.getInitialBalance()
          ),
          completionDate: await entry.getCompletionTime()
        };
      })
    );
    return [...collection, ...entries];
  }, Promise.resolve([]));
};

const getCosmosResources = async (
  account: Account,
  coreAccount
): Promise<CosmosResources> => {
  const cosmosAccount = await coreAccount.asCosmosLikeAccount();
  const flattenDelegation = await getFlattenDelegation(cosmosAccount);
  console.log("flattenDel", flattenDelegation);
  const flattenUnbonding = await getFlattenUnbonding(cosmosAccount);
  console.log("flattenUn", flattenUnbonding);
  const flattenRedelegation = await getFlattenRedelegations(cosmosAccount);
  console.log("flattenRe", flattenRedelegation);

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
    unboundingBalance: flattenUnbonding.reduce(
      (old, current) => old.plus(current.amount),
      BigNumber(0)
    ),
    withdrawAddress: ""
  };

  return res;
};

const postBuildAccount = async ({
  account,
  coreAccount
}: {
  account: Account,
  coreAccount: CoreAccount
}): Promise<Account> => {
  account.cosmosResources = await getCosmosResources(account, coreAccount);
  return account;
};

export default postBuildAccount;
