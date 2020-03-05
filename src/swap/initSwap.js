// @flow

import { BigNumber } from "bignumber.js";
import secp256k1 from "secp256k1";
import Swap from "@ledgerhq/hw-app-swap";
import { from } from "rxjs";
import perFamily from "../generated/swap";
import type { CryptoCurrency } from "../types/currencies";
import type { Transaction } from "../generated/types";
import { getAccountCurrency, getMainAccount } from "../account";
import network from "../network";
import { getAccountBridge } from "../bridge";
import type {
  Exchange,
  ExchangeRate,
  InitSwap,
  SwapProviderNameAndSignature
} from "./types";
import { withDevice } from "../hw/deviceAccess";
import type { Account } from "../types";
import { getCurrencySwapConfig, getSwapProviders, swapAPIBaseURL } from "./";

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

    // FIXME because this would break for tokens
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
    let transaction = accountBridge.createTransaction(refundAccount);

    // FIXME we send decimals but swap wants satoshis
    transaction = accountBridge.updateTransaction(transaction, {
      amount: BigNumber(
        swapResult.amountExpectedFrom * 10 ** refundCurrency.units[0].magnitude
      ),
      recipient: swapResult.payinAddress
    });

    transaction = await accountBridge.prepareTransaction(
      refundAccount,
      transaction
    );

    const { errors } = await accountBridge.getTransactionStatus(
      refundAccount,
      transaction
    );

    if (errors.recipient || errors.amount) {
      throw errors.recipient || errors.amount;
    }

    return { transaction, swapId };
  }
  // FIXME better error handling
  throw new Error("initSwap: Something broke");
};

// NB If any of the swap interactions fail it throws an error, maybe we can remap
// those errors to handle them differently.
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
  await swap.setPartnerKey(provider.nameAndPubkey);
  await swap.checkPartner(provider.signature);
  await swap.processTransaction(Buffer.from(swapResult.binaryPayload, "hex"));
  const goodSign = secp256k1.signatureExport(
    Buffer.from(swapResult.signature, "hex")
  );
  await swap.checkTransactionSignature(goodSign);
  const payoutAddressParameters = await perFamily[
    payoutCurrency.family
  ].getSerializedAddressParameters(
    payoutAccount.freshAddressPath,
    payoutAccount.derivationMode
  );

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
  ].getSerializedAddressParameters(
    refundAccount.freshAddressPath,
    refundAccount.derivationMode
  );

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
