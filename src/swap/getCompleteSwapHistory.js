// @flow

import type { AccountLike } from "../types";
import type { MappedSwapOperation, SwapOperation } from "./types";
import getStatus from "./getStatus";

const getSwapOperationMap = (
  account: AccountLike,
  accounts: AccountLike[],
  dontUpdate?: boolean
) => async (swapOperation: SwapOperation) => {
  const {
    provider,
    swapId,
    receiverAccountId,
    operationId,
    fromAmount,
    toAmount,
    status,
  } = swapOperation;

  const toAccount = accounts.find((a) => a.id === receiverAccountId);
  const operation = account.operations.find((o) => o.id === operationId);

  // NB future improvement, we could group the swapStatusRequests into an array and trigger
  // a single call to the backend. I didn't plan for that initially.

  const updatedSwapStatus = dontUpdate
    ? { status }
    : await getStatus({ provider, swapId });

  if (account && toAccount && operation && updatedSwapStatus) {
    return {
      provider,
      swapId,
      status: updatedSwapStatus.status,
      toAccount,
      fromAccount: account,
      operation,
      fromAmount,
      toAmount,
    };
  }
};

const getCompleteSwapHistory = async (
  accounts: AccountLike[],
  dontUpdate?: boolean
): Promise<MappedSwapOperation[]> => {
  const swaps = [];
  for (const account of accounts) {
    const { swapHistory } = account;
    const mapFn = getSwapOperationMap(account, accounts, dontUpdate);
    if (swapHistory) {
      const mappedSwapHistory = await Promise.all(swapHistory.map(mapFn));

      if (mappedSwapHistory) {
        swaps.push(...mappedSwapHistory.filter(Boolean));
      }
    }
  }
  swaps.sort((a, b) => b.operation.date - a.operation.date);
  return swaps;
};

export default getCompleteSwapHistory;
