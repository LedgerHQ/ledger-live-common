import { Account } from "../../types";
import { Transaction } from "./types";
import BigNumber from "bignumber.js";
import { simulate } from "./api/Cosmos";
import { encodePubkey } from "@cosmjs/proto-signing";
import { getEnv } from "../../env";
import { buildTransaction, postBuildTransaction } from "./js-buildTransaction";
import { getMaxEstimatedBalance } from "./logic";

const prepareTransaction = async (
  account: Account,
  transaction: Transaction,
  calculateFees?: boolean
): Promise<Transaction> => {
  let memo = transaction.memo;
  let fees = transaction.fees;
  let gas = transaction.gas;
  let amount = transaction.amount;

  let gasQty = new BigNumber(250000);
  const gasPrice = new BigNumber(getEnv("COSMOS_GAS_PRICE"));

  if (transaction.useAllAmount && !calculateFees) {
    const tempTransaction = await prepareTransaction(
      account,
      {
        ...transaction,
        amount: account.spendableBalance.minus(new BigNumber(2500)),
      },
      true
    );

    amount = getMaxEstimatedBalance(
      account,
      tempTransaction.fees || new BigNumber(0)
    );
  }

  if (transaction.mode !== "send" && !transaction.memo) {
    memo = "Ledger Live";
  }

  const unsignedPayload = await buildTransaction(account, {
    ...transaction,
    amount,
  });

  // be sure payload is complete
  if (unsignedPayload) {
    const pubkey = encodePubkey({
      type: "tendermint/PubKeySecp256k1",
      value: Buffer.from(account.seedIdentifier, "hex").toString("base64"),
    });

    const tx_bytes = await postBuildTransaction(
      account,
      { ...transaction, memo, fees, gas, amount },
      pubkey,
      unsignedPayload,
      new Uint8Array(Buffer.from(account.seedIdentifier, "hex"))
    );

    const gasUsed = await simulate(tx_bytes);

    if (gasUsed.gt(0)) {
      gasQty = gasUsed
        // Don't known what is going on,
        // Ledger Live Desktop return half of what it should,
        // Ledger Live Common CLI do the math correctly.
        // Use coeff 2 as trick..
        // .multipliedBy(new BigNumber(getEnv("COSMOS_GAS_AMPLIFIER")))
        .multipliedBy(new BigNumber(getEnv("COSMOS_GAS_AMPLIFIER") * 2))
        .integerValue();
    }
  }

  gas = gasQty;

  fees = gasPrice.multipliedBy(gasQty).integerValue();

  if (
    transaction.memo !== memo ||
    !fees.eq(transaction.fees || new BigNumber(0)) ||
    !gas.eq(transaction.gas || new BigNumber(0)) ||
    !amount.eq(transaction.amount)
  ) {
    return { ...transaction, memo, fees, gas, amount };
  }

  return transaction;
};

export default prepareTransaction;
