// @flow
import type Transport from "@ledgerhq/hw-transport";
import Sell from "./hw-app-sell/Sell";
import { getAccountCurrency, getAccountUnit, getMainAccount } from "../account";
import { BigNumber } from "bignumber.js";
import network from "../network";
import {
  getCurrencySwapConfig,
  getProviderNameAndSignature,
  getSwapAPIBaseURL,
} from "../swap";
import { getAccountBridge } from "../bridge";
import invariant from "invariant";
import secp256k1 from "secp256k1";
import perFamily from "../generated/swap";
import { TransportStatusError } from "@ledgerhq/hw-transport";
import { WrongDeviceForAccount } from "@ledgerhq/errors";
import type { Account, AccountLike, Transaction } from "../types";
import { getProvider } from "./index";

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

  const sell = new Sell(transport, 0x01);

  const { errors, estimatedFees } = status;

  const provider = getProvider("coinifySandbox");

  // Prepare swap app to receive the tx to forward.
  await sell.setPartnerKey(provider.nameAndPubkey);

  await sell.checkPartner(provider.signature);

  await sell.processTransaction(
    Buffer.from(binaryPayload, "base64"),
    estimatedFees
  );
  const goodSign = secp256k1.signatureExport(
    Buffer.from(payloadSignature, "base64")
  );
  await sell.checkTransactionSignature(goodSign);

  const payoutCurrency = getAccountCurrency(account);

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
  await sell.signCoinTransaction();
  return "done !";
};
