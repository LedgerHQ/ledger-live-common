// @flow
import type { Account } from "../../types";
import type { CoreAccount } from "../../libcore/types";
import type { CosmosResources, CoreCosmosLikeAccount } from "./types";
import { BigNumber } from "bignumber.js";
import { log } from "@ledgerhq/logs";
import {
  libcoreAmountToBigNumber,
  libcoreBigIntToBigNumber,
} from "../../libcore/buildBigNumber";
import { promiseAllBatched } from "../../promise";

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

  return await promiseAllBatched(10, delegations, async (delegation) => {
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
      status: await getValidatorStatus(cosmosAccount, validatorAddress),
    };
  });
};

const getFlattenRedelegations = async (cosmosAccount) => {
  const redelegations = await cosmosAccount.getRedelegations();

  return redelegations.reduce(async (old, current) => {
    const collection = await old;
    const entries = await current.getEntries();
    const redelegationMapped = await promiseAllBatched(
      3,
      entries,
      async (entry) => {
        return {
          validatorSrcAddress: await current.getSrcValidatorAddress(),
          validatorDstAddress: await current.getDstValidatorAddress(),
          amount: await libcoreBigIntToBigNumber(
            await entry.getInitialBalance()
          ),
          completionDate: await entry.getCompletionTime(),
        };
      }
    );
    return [...collection, ...redelegationMapped];
  }, Promise.resolve([]));
};

const getFlattenUnbonding = async (cosmosAccount) => {
  const unbondings = await cosmosAccount.getUnbondings();

  return unbondings.reduce(async (old, current) => {
    const collection = await old;
    const entries = await current.getEntries();
    const unbondingMapped = await promiseAllBatched(
      3,
      entries,
      async (entry) => {
        return {
          validatorAddress: await current.getValidatorAddress(),
          amount: await libcoreBigIntToBigNumber(
            await entry.getInitialBalance()
          ),
          completionDate: await entry.getCompletionTime(),
        };
      }
    );
    return [...collection, ...unbondingMapped];
  }, Promise.resolve([]));
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
    unboundingBalance: flattenUnbonding.reduce(
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
  return account;
};

export default postBuildAccount;
