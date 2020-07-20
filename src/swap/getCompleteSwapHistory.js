// @flow

import type { Account } from "../types";
import type { SwapHistorySection, SwapOperation } from "./types";
import { findTokenById } from "../data/tokens";
import { accountWithMandatoryTokens, getAccountCurrency } from "../account";

const getSwapOperationMap = (account: Account, accounts: Account[]) => (
  swapOperation: SwapOperation
) => {
  const {
    provider,
    swapId,
    receiverAccountId,
    operationId,
    fromAmount,
    toAmount,
    status,
    tokenId,
  } = swapOperation;
  const operation = account.operations.find((o) => o.id === operationId);

  if (operation) {
    let toAccount = accounts.find((a) => a.id === receiverAccountId);
    let toParentAccount;
    let toExists = true;
    if (toAccount && tokenId) {
      const token = findTokenById(tokenId);
      if (token) {
        toParentAccount = toAccount;

        // Enhance the account with the given token in case we don't have funds yet.
        toAccount = (
          accountWithMandatoryTokens(toAccount, [token]).subAccounts || []
        ).find((a) => getAccountCurrency(a).id === tokenId);

        toExists = (toParentAccount.subAccounts || []).includes(toAccount);
      }
    }

    if (account && toAccount && status) {
      return {
        provider,
        swapId,
        status,
        toAccount,
        toParentAccount,
        fromAccount: account,
        operation,
        fromAmount,
        toAmount,
        toExists,
      };
    }
  }
};

function startOfDay(t) {
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}

const getCompleteSwapHistory = (accounts: Account[]): SwapHistorySection[] => {
  const swaps = [];
  for (const account of accounts) {
    const { swapHistory } = account;
    const mapFn = getSwapOperationMap(account, accounts);
    if (swapHistory) {
      const mappedSwapHistory = swapHistory.map(mapFn);

      if (mappedSwapHistory) {
        swaps.push(...mappedSwapHistory.filter(Boolean));
      }
    }
  }

  swaps.sort((a, b) => b.operation.date - a.operation.date);
  if (!swaps.length) return [];

  let sections = [];
  let day = startOfDay(swaps[0].operation.date);
  let data = [swaps[0]];
  let skip = true;

  for (const swap of swaps) {
    if (startOfDay(swap.operation.date) < day) {
      sections.push({ day, data });
      // Move to a new section
      day = startOfDay(swap.operation.date);
      data = [swap];
      continue;
    } else if (!skip) {
      data.push(swap);
    }
    skip = false;
  }

  if (data.length > 0) {
    sections.push({ day, data });
  }

  return sections;
};

export default getCompleteSwapHistory;
