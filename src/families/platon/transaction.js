// @flow
import invariant from "invariant";
import { BigNumber } from "bignumber.js";
import { log } from "@ledgerhq/logs";
import { Transaction as EthereumTx } from "ethereumjs-tx";
import type { Transaction, TransactionRaw } from "./types";
import Common from "ethereumjs-common";
import eip55 from "eip55";
import {
  InvalidAddress,
  ETHAddressNonEIP,
  RecipientRequired,
} from "@ledgerhq/errors";
import {
  fromTransactionCommonRaw,
  toTransactionCommonRaw,
} from "../../transaction/common";
import type { CryptoCurrency, TransactionStatus, Account } from "../../types";
import { getAccountUnit } from "../../account";
import { formatCurrencyUnit } from "../../currencies";
import { apiForCurrency } from "../../api/Platon";
import { makeLRUCache } from "../../cache";
import { getEnv } from "../../env";
import { modes } from "./modules";
import { fromRangeRaw, toRangeRaw } from "../../range";
import { isBech32Address, isAddress } from "./utils.min.js";

export function isRecipientValid(currency: CryptoCurrency, recipient: string) {
  return isBech32Address(recipient) || isAddress(recipient);
}

export function validateRecipient(
  currency: CryptoCurrency,
  recipient: string,
  { errors, warnings }: TransactionStatus
) {
  if (!recipient) {
    errors.recipient = new RecipientRequired("");
  } else if (!isRecipientValid(currency, recipient)) {
    errors.recipient = new InvalidAddress("", {
      currencyName: currency.name,
    });
  }
}

export const formatTransaction = (
  t: Transaction,
  mainAccount: Account
): string => {
  const gasLimit = getGasLimit(t);
  const account =
    (t.subAccountId &&
      (mainAccount.subAccounts || []).find((a) => a.id === t.subAccountId)) ||
    mainAccount;
  return `
${t.mode.toUpperCase()} ${
    t.useAllAmount
      ? "MAX"
      : formatCurrencyUnit(getAccountUnit(account), t.amount, {
          showCode: true,
          disableRounding: true,
        })
  }
TO ${t.recipient}
with gasPrice=${formatCurrencyUnit(
    getAccountUnit(account),
    t.gasPrice || BigNumber(0),
    {
      showCode: true,
      disableRounding: true,
    }
  )}
with gasLimit=${gasLimit.toString()}`;
};

const defaultGasLimit = BigNumber(0x5208);

export const getGasLimit = (t: Transaction): BigNumber =>
  t.userGasLimit || t.estimatedGasLimit || defaultGasLimit;

export const fromTransactionRaw = (tr: TransactionRaw): Transaction => {
  const common = fromTransactionCommonRaw(tr);
  const { networkInfo } = tr;
  return {
    ...common,
    mode: tr.mode,
    nonce: tr.nonce,
    data: tr.data ? Buffer.from(tr.data, "hex") : undefined,
    family: tr.family,
    gasPrice: tr.gasPrice ? BigNumber(tr.gasPrice) : null,
    userGasLimit: tr.userGasLimit ? BigNumber(tr.userGasLimit) : null,
    estimatedGasLimit: tr.estimatedGasLimit
      ? BigNumber(tr.estimatedGasLimit)
      : null,
    feeCustomUnit: tr.feeCustomUnit, // FIXME this is not good.. we're dereferencing here. we should instead store an index (to lookup in currency.units on UI)
    networkInfo: networkInfo && {
      family: networkInfo.family,
      gasPrice: fromRangeRaw(networkInfo.gasPrice),
    },
    allowZeroAmount: tr.allowZeroAmount,
    feesStrategy: tr.feesStrategy,
  };
};

export const toTransactionRaw = (t: Transaction): TransactionRaw => {
  const common = toTransactionCommonRaw(t);
  const { networkInfo } = t;
  return {
    ...common,
    mode: t.mode,
    nonce: t.nonce,
    family: t.family,
    data: t.data ? t.data.toString("hex") : undefined,
    gasPrice: t.gasPrice ? t.gasPrice.toString() : null,
    userGasLimit: t.userGasLimit ? t.userGasLimit.toString() : null,
    estimatedGasLimit: t.estimatedGasLimit
      ? t.estimatedGasLimit.toString()
      : null,
    feeCustomUnit: t.feeCustomUnit, // FIXME drop?
    networkInfo: networkInfo && {
      family: networkInfo.family,
      gasPrice: toRangeRaw(networkInfo.gasPrice),
    },
    allowZeroAmount: t.allowZeroAmount,
    feesStrategy: t.feesStrategy,
  };
};

// see https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md
function getEthereumjsTxCommon(currency) {
  const { ethereumLikeInfo } = currency;
  invariant(
    ethereumLikeInfo,
    `currency ${currency.id} did not set ethereumLikeInfo`
  );
  if (ethereumLikeInfo.chainId === 1) {
    return new Common(
      // $FlowFixMe
      ethereumLikeInfo.baseChain || "mainnet",
      // $FlowFixMe
      ethereumLikeInfo.hardfork || "petersburg"
    );
  }
  return Common.forCustomChain(
    // $FlowFixMe
    ethereumLikeInfo.baseChain || "mainnet",
    {
      name: currency.ticker,
      chainId: ethereumLikeInfo.chainId,
      // $FlowFixMe
      networkId: ethereumLikeInfo.networkId || ethereumLikeInfo.chainId,
    },
    // $FlowFixMe
    ethereumLikeInfo.hardfork || "petersburg"
  );
}

export function inferTokenAccount(a: Account, t: Transaction) {
  const tokenAccount = !t.subAccountId
    ? null
    : a.subAccounts && a.subAccounts.find((ta) => ta.id === t.subAccountId);
  if (tokenAccount && tokenAccount.type === "TokenAccount") {
    return tokenAccount;
  }
}

export function buildEthereumTx(
  account: Account,
  transaction: Transaction,
  nonce: number
) {
  const { currency } = account;
  const { gasPrice } = transaction;
  const subAccount = inferTokenAccount(account, transaction);

  invariant(
    !subAccount || subAccount.type === "TokenAccount",
    "only token accounts expected"
  );

  const common = getEthereumjsTxCommon(currency);

  const gasLimit = getGasLimit(transaction);

  const ethTxObject: Object = {
    nonce,
    gasPrice: `0x${BigNumber(gasPrice || 0).toString(16)}`,
    gasLimit: `0x${BigNumber(gasLimit).toString(16)}`,
  };

  const m = modes[transaction.mode];
  invariant(m, "missing module for mode=" + transaction.mode);
  const fillTransactionDataResult = m.fillTransactionData(
    account,
    transaction,
    ethTxObject
  );

  log("platon", "buildEthereumTx", ethTxObject);

  const tx = new EthereumTx(ethTxObject, { common });
  // these will be filled by device signature
  tx.raw[6] = Buffer.from([common.chainId()]); // v
  tx.raw[7] = Buffer.from([]); // r
  tx.raw[8] = Buffer.from([]); // s

  return { tx, fillTransactionDataResult };
}

export const estimateGasLimit: (
  account: Account,
  transaction: Transaction
) => Promise<BigNumber> = makeLRUCache(
  (account: Account, transaction: Transaction) => {
    const api = apiForCurrency(account.currency);
    return api
      .getDryRunGasLimit(account, transaction)
      .then((value) =>
        value.eq(21000) // regular ETH send should not be amplified
          ? value
          : value.times(getEnv("ETHEREUM_GAS_LIMIT_AMPLIFIER")).integerValue()
      )
      .catch(() => api.roughlyEstimateGasLimit());
  },
  (a, t) =>
    a.id +
    "|" +
    String(a.freshAddress) +
    "+" +
    String(t.recipient) +
    "+" +
    String(t.data) +
    "+" +
    String(t.gasPrice) +
    "+1"
);

export default {
  formatTransaction,
  fromTransactionRaw,
  toTransactionRaw,
};
