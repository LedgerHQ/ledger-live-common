// @flow
import type Transport from "@ledgerhq/hw-transport";
import Sell from "./hw-app-sell/Sell";
import { getAccountCurrency, getAccountUnit, getMainAccount } from "../account";
import { BigNumber } from "bignumber.js";
import { log } from "@ledgerhq/logs";
import {
  getCurrencySwapConfig,
} from "../swap";
import perFamily from "../generated/swap";
import { TransportStatusError } from "@ledgerhq/hw-transport";
import { WrongDeviceForAccount } from "@ledgerhq/errors";
import type { Account, AccountLike, Transaction } from "../types";
import { getProvider } from "./index";
import { delay } from "../promise";

type SellInput = {
  parentAccount: ?Account,
  account: AccountLike,
  transaction: Transaction,
  signature: string,
  status: TransactionStatus,
  signature: string,
  binaryPayload: string,
};

export default async (
  transport: Transport<*>,
  input: SellInput
): Promise<string> => {
  const {
    receiver,
    binaryPayload,
    payloadSignature,
    account,
    transaction,
    status,
  } = input;

  log("gre", "________ 1");
  const sell = new Sell(transport, 0x01);

  log("gre", "________ 2");
  const { errors, estimatedFees } = status;

  log("gre", "________ 3");
  const provider = getProvider("coinifySandbox");

  // Prepare swap app to receive the tx to forward.
  log("gre", "________ Set partner key");
  await sell.setPartnerKey(provider.nameAndPubkey);

  log("gre", "________ Check partner");
  await sell.checkPartner(provider.signature);

  log("gre", "________ Process transaction, ", {
    payload: binaryPayload,
    estimatedFees,
    status,
    type: typeof estimatedFees,
  });
  await sell.processTransaction(
    Buffer.from(binaryPayload, "ascii"),
    estimatedFees
  );

  log("gre", "________ Check transaction signature", { payloadSignature });
  await sell.checkTransactionSignature(Buffer.from(payloadSignature, "base64"));
  const payoutCurrency = getAccountCurrency(account);

  log("gre", "________ Get serializer address parameters");

  const payoutAddressParameters = await perFamily[
    payoutCurrency.family
  ].getSerializedAddressParameters(
    account.freshAddressPath,
    account.derivationMode,
    account.id
  );

  const {
    config: payoutAddressConfig,
    signature: payoutAddressConfigSignature,
  } = getCurrencySwapConfig(payoutCurrency);
  try {
    log("gre", "________ Check payout address", {
      payoutAddressConfig,
      payoutAddressConfigSignature,
      payoutAddressParameters,
    });

    await sell.checkPayoutAddress(
      payoutAddressConfig,
      payoutAddressConfigSignature,
      payoutAddressParameters.addressParameters
    );
  } catch (e) {
    if (e instanceof TransportStatusError && e.statusCode === 0x6a83) {
      throw new WrongDeviceForAccount(null, {
        accountName: account.name,
      });
    }
    throw e;
  }

  log("gre", "________ Sign coin transaction");
  await sell.signCoinTransaction();

  await delay(3000);

  return {
    type: "init-sell-result",
    initSwapResult: { transaction },
  };
};
