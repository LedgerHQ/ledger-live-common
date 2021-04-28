// @flow
import invariant from "invariant";
import { BigNumber } from "bignumber.js";
import type { Account, Operation, Unit } from "../../types";
import { getAccountUnit } from "../../account";
import { formatCurrencyUnit } from "../../currencies";

function formatAccountSpecifics(account: Account): string {
  const { cryptoOrgResources } = account;
  invariant(cryptoOrgResources, "Crypto.org account expected");
  const unit = getAccountUnit(account);
  const formatConfig = {
    disableRounding: true,
    alwaysShowSign: false,
    showCode: true,
  };

  let str = " ";

  str +=
    formatCurrencyUnit(unit, account.spendableBalance, formatConfig) +
    " spendable. ";

  if (cryptoOrgResources.additionalBalance.gt(0)) {
    str +=
      formatCurrencyUnit(
        unit,
        cryptoOrgResources.additionalBalance,
        formatConfig
      ) + " additional. ";
  }

  if (cryptoOrgResources.nonce) {
    str += "\nonce : " + cryptoOrgResources.nonce;
  }

  return str;
}

function formatOperationSpecifics(op: Operation, unit: ?Unit): string {
  const { validators } = op.extra;
  return (validators || [])
    .map(
      (v) =>
        `\n    to ${v.address} ${
          unit
            ? formatCurrencyUnit(unit, BigNumber(v.amount), {
                showCode: true,
                disableRounding: true,
              }).padEnd(16)
            : v.amount
        }`
    )
    .join("");
}

export function fromOperationExtraRaw(extra: ?Object) {
  if (extra && extra.additionalField) {
    extra = {
      ...extra,
      additionalField: BigNumber(extra.additionalField),
    };
  }
  return extra;
}

export function toOperationExtraRaw(extra: ?Object) {
  if (extra && extra.additionalField) {
    extra = {
      ...extra,
      additionalField: extra.additionalField.toString(),
    };
  }
  return extra;
}

export default {
  formatAccountSpecifics,
  formatOperationSpecifics,
  fromOperationExtraRaw,
  toOperationExtraRaw,
};