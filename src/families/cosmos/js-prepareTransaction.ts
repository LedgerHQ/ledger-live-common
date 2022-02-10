import { Account } from "../../types";
import { Transaction } from "./types";
import BigNumber from "bignumber.js";
import { getAccount, simulate } from "./api/Cosmos";
import {
  encodePubkey,
  makeAuthInfoBytes,
  Registry,
  TxBodyEncodeObject,
} from "@cosmjs/proto-signing";
import { SignMode } from "cosmjs-types/cosmos/tx/signing/v1beta1/signing";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import {
  MsgDelegate,
  MsgUndelegate,
  MsgBeginRedelegate,
} from "cosmjs-types/cosmos/staking/v1beta1/tx";
import { MsgWithdrawDelegatorReward } from "cosmjs-types/cosmos/distribution/v1beta1/tx";
import { getEnv } from "../../env";
import buildTransaction from "./js-buildTransaction";
import { getMaxEstimatedBalance } from "./logic";

const prepareTransaction = async (
  account: Account,
  transaction: Transaction
): Promise<Transaction> => {
  const patch: Partial<Transaction> = {};

  let gasQty = new BigNumber(250000);
  const gasPrice = new BigNumber(getEnv("COSMOS_GAS_PRICE"));

  if (transaction.useAllAmount) {
    patch.amount = getMaxEstimatedBalance(
      account,
      account.balance
        .dividedBy(new BigNumber(getEnv("COSMOS_GAS_AMPLIFIER")))
        .integerValue()
    );
  }

  if (transaction.mode !== "send" && !transaction.memo) {
    patch.memo = "Ledger Live";
  }

  const unsignedPayload = await buildTransaction(account, transaction);

  // be sure payload is complete
  if (unsignedPayload) {
    const txBodyFields: TxBodyEncodeObject = {
      typeUrl: "/cosmos.tx.v1beta1.TxBody",
      value: {
        messages: unsignedPayload,
      },
    };

    const registry = new Registry([
      ["/cosmos.staking.v1beta1.MsgDelegate", MsgDelegate],
      ["/cosmos.staking.v1beta1.MsgUndelegate", MsgUndelegate],
      ["/cosmos.staking.v1beta1.MsgBeginRedelegate", MsgBeginRedelegate],
      [
        "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
        MsgWithdrawDelegatorReward,
      ],
    ]);

    const { sequence } = await getAccount(account.freshAddress);

    const pubkey = encodePubkey({
      type: "tendermint/PubKeySecp256k1",
      value: Buffer.from(account.seedIdentifier, "hex").toString("base64"),
    });

    const txBodyBytes = registry.encode(txBodyFields);

    const authInfoBytes = makeAuthInfoBytes(
      [{ pubkey, sequence }],
      [
        {
          amount:
            transaction.fees?.toString() || new BigNumber(2500).toString(),
          denom: account.currency.units[1].code,
        },
      ],
      transaction.gas?.toNumber() || new BigNumber(250000).toNumber(),
      SignMode.SIGN_MODE_LEGACY_AMINO_JSON
    );

    const txRaw = TxRaw.fromPartial({
      bodyBytes: txBodyBytes,
      authInfoBytes,
      signatures: [new Uint8Array(Buffer.from(account.seedIdentifier, "hex"))],
    });

    const tx_bytes = Array.from(Uint8Array.from(TxRaw.encode(txRaw).finish()));

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

  patch.gas = gasQty;

  patch.fees = gasPrice.multipliedBy(gasQty).integerValue();

  return { ...transaction, ...patch };
};

export default prepareTransaction;
