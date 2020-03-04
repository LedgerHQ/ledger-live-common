// @flow
/* eslint-disable no-console */

import secp256k1 from "secp256k1";
import Swap from "@ledgerhq/hw-app-swap";
import perFamily from "../generated/swap";
import { from } from "rxjs";
import type {
  Exchange,
  ExchangeRate,
  InitSwap,
  SwapProviderNameAndSignature
} from "./types";
import type { Account } from "../types";
import type { CryptoCurrency } from "../types/currencies";
import type { Transaction } from "../generated/types";
import { getAccountCurrency, getMainAccount } from "../account";
import network from "../network";
import { getAccountBridge } from "../bridge";
import { getCurrencySwapConfig, getSwapProviders, swapAPIBaseURL } from "./";
import { withDevice } from "../hw/deviceAccess";

const initSwap: InitSwap = async (
  exchange: Exchange,
  exchangeRate: ExchangeRate,
  deviceId: string
): Promise<{
  transaction: Transaction,
  swapId: string
}> => {
  const deviceTransactionId = await withDevice(deviceId)(t => {
    const swap = new Swap(t);
    return from(swap.startNewTransaction());
  }).toPromise();

  const { provider, rateId } = exchangeRate;
  const { fromAmount: amountFrom } = exchange;
  const refundCurrency = getAccountCurrency(exchange.fromAccount);

  const payoutCurrency = getAccountCurrency(exchange.toAccount);
  const refundAccount = getMainAccount(
    exchange.fromAccount,
    exchange.fromParentAccount
  );
  const payoutAccount = getMainAccount(
    exchange.toAccount,
    exchange.toParentAccount
  );

  const res = await network({
    method: "POST",
    url: `${swapAPIBaseURL}/swap`,
    data: [
      {
        provider,
        amountFrom,
        from: refundCurrency.ticker,
        to: payoutCurrency.ticker,
        rateId,
        address: payoutAccount.freshAddress,
        refundAddress: refundAccount.freshAddress,
        deviceTransactionId
      }
    ]
  });

  if (res.data) {
    const swapResult = res.data[0];
    const { swapId, provider: providerName } = swapResult;
    const provider = getSwapProviders(providerName);

    // FIXME because this would only work for currencies right now
    if (payoutCurrency.type !== "CryptoCurrency") {
      throw new Error("How do I handle non CryptoCurrencies");
    }
    if (refundCurrency.type !== "CryptoCurrency") {
      throw new Error("How do I handle non CryptoCurrencies");
    }

    await withDevice(deviceId)(transport =>
      from(
        performSwapChecks({
          transport,
          provider,
          payoutAccount,
          payoutCurrency,
          refundAccount,
          refundCurrency,
          swapResult
        })
      )
    ).toPromise();

    const accountBridge = getAccountBridge(refundAccount);
    console.log("⁍ Creating transaction");
    let transaction = accountBridge.createTransaction(refundAccount);

    console.log("⁍ Updating transaction");
    transaction = accountBridge.updateTransaction(transaction, {
      amount: swapResult.amountExpectedFrom,
      recipient: swapResult.payinAddress
    });
    console.log("⁍ Preparing transaction");
    transaction = await accountBridge.prepareTransaction(
      refundAccount,
      transaction
    );

    // FIXME we send decimals but swap wants satoshis
    transaction.amount = transaction.amount * 10 ** 8;

    return { transaction, swapId };
  }

  throw new Error("initSwap: Something broke");
};

const performSwapChecks = async ({
  transport,
  provider,
  payoutAccount,
  refundAccount,
  payoutCurrency,
  refundCurrency,
  swapResult
}: {
  transport: *,
  provider: SwapProviderNameAndSignature,
  payoutAccount: Account,
  refundAccount: Account,
  payoutCurrency: CryptoCurrency,
  refundCurrency: CryptoCurrency,
  swapResult: *
}) => {
  const swap = new Swap(transport);
  console.log("⁍ Setting partner on swap");
  await swap.setPartnerKey(provider.nameAndPubkey);
  console.log("⁍ Checking partner on swap");
  await swap.checkPartner(provider.signature);
  console.log("⁍ Process the transaction payload");
  await swap.processTransaction(Buffer.from(swapResult.binaryPayload, "hex"));
  const goodSign = secp256k1.signatureExport(
    Buffer.from(swapResult.signature, "hex")
  );
  console.log("⁍ Checking transaction signature");
  await swap.checkTransactionSignature(goodSign);

  console.log(
    `⁍ Fetching address parameters from ${payoutAccount.freshAddressPath}`
  );

  const payoutAddressParameters = await perFamily[
    payoutCurrency.family
  ].getSerializedAddressParameters(payoutAccount.freshAddressPath, "p2sh");

  console.log("⁍ Checking payout address config/signature");
  const {
    config: payoutAddressConfig,
    signature: payoutAddressConfigSignature
  } = getCurrencySwapConfig(payoutCurrency);

  await swap.checkPayoutAddress(
    payoutAddressConfig,
    payoutAddressConfigSignature,
    payoutAddressParameters.addressParameters
  );

  const refundAddressParameters = await perFamily[
    refundCurrency.family
  ].getSerializedAddressParameters(refundAccount.freshAddressPath, "bech32");

  console.log("⁍ Checking refund address config/signature");
  const {
    config: refundAddressConfig,
    signature: refundAddressConfigSignature
  } = getCurrencySwapConfig(refundCurrency);

  await swap.checkRefundAddress(
    refundAddressConfig,
    refundAddressConfigSignature,
    refundAddressParameters.addressParameters
  );
};

export default initSwap;
