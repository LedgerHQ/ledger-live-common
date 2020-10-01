// @flow
// handle erc20 feature others than send.

import abi from "ethereumjs-abi";
import invariant from "invariant";
import eip55 from "eip55";
import { BigNumber } from "bignumber.js";
import type { ModeModule } from "../types";
import { AmountRequired } from "@ledgerhq/errors";
import { validateRecipient } from "../customAddressValidation";
import { inferTokenAccount } from "../transaction";

export type Modes = "erc20.approve";

// approve(address spender, uint256 amount) → bool
// transaction.recipient => address spender
// transaction.amount => amount
// transaction.useAllAmount => set max
const erc20approve: ModeModule = {
  fillTransactionStatus(a, t, result) {
    validateRecipient(a.currency, t.recipient, result);
    if (!t.useAllAmount && result.amount.eq(0)) {
      result.errors.amount = new AmountRequired();
    }
  },

  fillTransactionData(a, t, tx) {
    const subAccount = inferTokenAccount(a, t);
    invariant(subAccount, "sub account missing");
    const recipient = eip55.encode(t.recipient);
    let amount;
    if (t.useAllAmount) {
      amount = BigNumber(2).pow(256).minus(1);
    } else {
      invariant(!t.amount, "amount missing");
      amount = BigNumber(t.amount);
    }
    const data = abi.simpleEncode(
      "approve(address,uint256)",
      recipient,
      amount.toString(10)
    );
    tx.data = "0x" + data.toString("hex");
    tx.to = subAccount.token.contractAddress;
    tx.value = "0x00";
    return {
      erc20contracts: [recipient],
    };
  },

  fillOptimisticOperation() {},
};

export const modes: { [_: Modes]: ModeModule } = {
  "erc20.approve": erc20approve,
};
