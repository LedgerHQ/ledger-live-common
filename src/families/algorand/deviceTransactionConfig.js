// @flow

import type { AccountLike, TransactionStatus } from "../../types";
import type { Transaction } from "./types";
import type { DeviceTransactionField } from "../../transaction";
import { getAccountUnit } from "../../account";
import { formatCurrencyUnit } from "../../currencies";

const getSendFields = (transaction, status, account) => {
  const { token } = account;
  const { amount } = transaction;
  const { estimatedFees } = status;
  const fields = [];

  fields.push({
    type: "text",
    label: "Type",
    value: (account.type === "TokenAccount") ? "Asset xfer" : "Payment",
  });

  if (estimatedFees && !estimatedFees.isZero()) {
    fields.push({
      type: "fees",
      label: "Fee",
    });
  }

  if (account.type === "TokenAccount") {
    fields.push({
      type: "text",
      label: "Asset id",
      value: account.token.id.split("/")[2],
    });
  }

  if (amount) {
    fields.push({
      type: "text",
      label: "Amount",
      value: formatCurrencyUnit(getAccountUnit(account), amount, {
        showCode: true,
        disableRounding: true,
      }),
    });
  }

  return fields;
};

function getDeviceTransactionConfig({
  account,
  transaction,
  status,
}: {
  account: AccountLike,
  transaction: Transaction,
  status: TransactionStatus,
}): Array<DeviceTransactionField> {
  const { mode, assetId } = transaction;
  const { estimatedFees } = status;

  let fields = [];

  switch (mode) {
    case "send":
    case "claimReward":
    case "claimRewards": //tmp waiting for desktop / mobile to be fix
      fields = getSendFields(transaction, status, account);
      break;

    case "optIn":
      fields.push({
        type: "text",
        label: "Type",
        value: "Asset xfer",
      });

      if (estimatedFees && !estimatedFees.isZero()) {
        fields.push({
          type: "fees",
          label: "Fee",
        });
      }

      fields.push({
        type: "text",
        label: "Asset id",
        value: assetId?.split("/")[2] || assetId || "",
      });

      fields.push({
        type: "text",
        label: "Asset amt",
        value: "0",
      });
      break;

    case "optOut":
      fields.push({
        type: "text",
        label: "Type",
        value: "Opt out",
      });
      if (assetId)
        fields.push({
          type: "text",
          label: "Asset id",
          value: assetId,
        });
      break;

    default:
      break;
  }

  return fields;
}

export default getDeviceTransactionConfig;
