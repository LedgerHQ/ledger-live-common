// @flow
/* eslint-disable no-console */

import secp256k1 from "secp256k1";
import type Transport from "@ledgerhq/hw-transport";
import Swap from "@ledgerhq/hw-app-swap";
import perFamily from "../generated/swap";

import type { Exchange, ExchangeRate, InitSwap } from "./types";
import type { Transaction } from "../generated/types";
import { getAccountCurrency, getMainAccount } from "../account";
import network from "../network";
import { getAccountBridge } from "../bridge";
import { getCurrencySwapConfig, getSwapProviders, swapAPIBaseURL } from "./";

const initSwap: InitSwap = async (
  exchange: Exchange,
  exchangeRate: ExchangeRate,
  transport: Transport<*>
): Promise<{
  transaction: Transaction,
  swapId: string
}> => {
  const swap = new Swap(transport);
  const { provider, rateId } = exchangeRate;
  const { fromAmount: amountFrom } = exchange;
  const refundCurrency = getAccountCurrency(exchange.fromAccount);
  const payoutCurrency = getAccountCurrency(exchange.toAccount);

  const deviceTransactionId = await swap.startNewTransaction();
  const refundAddress = getMainAccount(
    exchange.fromAccount,
    exchange.fromParentAccount
  );
  const payoutAddress = getMainAccount(
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
        address: payoutAddress.freshAddress,
        refundAddress: refundAddress.freshAddress,
        deviceTransactionId
      }
    ]
  });

  if (res.data) {
    const swapResult = res.data[0];
    const { swapId, provider: providerName } = swapResult;
    const provider = getSwapProviders(providerName);

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
      `⁍ Fetching address parameters from ${payoutAddress.freshAddressPath}`
    );

    // FIXME because this would only work for currencies right now
    if (payoutCurrency.type !== "CryptoCurrency") {
      throw new Error("How do I handle non CryptoCurrencies");
    }
    if (refundCurrency.type !== "CryptoCurrency") {
      throw new Error("How do I handle non CryptoCurrencies");
    }

    const payoutAddressParameters = await perFamily[
      payoutCurrency.family
    ].getSerializedAddressParameters(payoutAddress.freshAddressPath, "p2sh");

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
    ].getSerializedAddressParameters(refundAddress.freshAddressPath, "bech32");

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

    const accountBridge = getAccountBridge(refundAddress);

    console.log("⁍ Creating transaction");
    let transaction = accountBridge.createTransaction(refundAddress);

    console.log("⁍ Updating transaction");
    transaction = accountBridge.updateTransaction(transaction, {
      amount: swapResult.amountExpectedFrom,
      recipient: swapResult.payinAddress
    });
    console.log("⁍ Preparing transaction");
    transaction = await accountBridge.prepareTransaction(
      refundAddress,
      transaction
    );

    // FIXME we send decimals but swap wants satoshis
    transaction.amount = transaction.amount * 10 ** 8;

    return { transaction, swapId };
  }

  throw new Error("initSwap: Something broke");
};

export default initSwap;
