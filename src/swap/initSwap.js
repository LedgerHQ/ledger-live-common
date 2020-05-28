// @flow

import { BigNumber } from "bignumber.js";
import secp256k1 from "secp256k1";
import Swap from "./hw-app-swap/Swap";
import { mockInitSwap } from "./mock";
import perFamily from "../generated/swap";
import { getAccountCurrency, getAccountUnit, getMainAccount } from "../account";
import network from "../network";
import { getAccountBridge } from "../bridge";
import type {
  Exchange,
  ExchangeRate,
  InitSwap,
  SwapRequestEvent,
} from "./types";
import { Observable } from "rxjs";
import { withDevice } from "../hw/deviceAccess";
import {
  getCurrencySwapConfig,
  getProviderNameAndSignature,
  swapAPIBaseURL
} from "./";
import { getEnv } from "../env";

const initSwap: InitSwap = (
  exchange: Exchange,
  exchangeRate: ExchangeRate,
  deviceId: string
): Observable<SwapRequestEvent> => {
  if (getEnv("MOCK")) return mockInitSwap(exchange, exchangeRate, deviceId);
  return withDevice(deviceId)(transport =>
    Observable.create(o => {
      let unsubscribed = false;
      const confirmSwap = async () => {
        const swap = new Swap(transport);
        // NB this id is crucial to prevent replay attacks, if it changes
        // we need to start the flow again.
        const deviceTransactionId = await swap.startNewTransaction();
        const { provider, rateId } = exchangeRate;
        const unitFrom = getAccountUnit(exchange.fromAccount);
        const amountFrom = exchange.fromAmount.div(
          BigNumber(10).pow(unitFrom.magnitude)
        );

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

        // Request a lock on the specified rate for 20 minutes,
        // user is expected to send funds after this.
        const res = await network({
          method: "POST",
          url: `${swapAPIBaseURL}/swap`,
          data: [
            {
              provider,
              amountFrom,
              from: refundCurrency.id,
              to: payoutCurrency.id,
              rateId,
              address: payoutAccount.freshAddress,
              refundAddress: refundAccount.freshAddress,
              deviceTransactionId
            }
          ]
        });

        const swapResult = res.data[0];
        const { swapId, provider: providerName } = swapResult;
        const providerNameAndSignature = getProviderNameAndSignature(
          providerName
        );

        // FIXME because this would break for tokens
        if (payoutCurrency.type !== "CryptoCurrency") {
          throw new Error("How do I handle non CryptoCurrencies");
        }
        if (refundCurrency.type !== "CryptoCurrency") {
          throw new Error("How do I handle non CryptoCurrencies");
        }

        const accountBridge = getAccountBridge(refundAccount);
        let transaction = accountBridge.createTransaction(refundAccount);

        // FIXME we send decimals but swap wants satoshis
        transaction = accountBridge.updateTransaction(transaction, {
          amount: BigNumber(
            swapResult.amountExpectedFrom *
              10 ** refundCurrency.units[0].magnitude
          ),
          recipient: swapResult.payinAddress
        });

        transaction = await accountBridge.prepareTransaction(
          refundAccount,
          transaction
        );

        const {
          errors,
          estimatedFees
        } = await accountBridge.getTransactionStatus(
          refundAccount,
          transaction
        );

        if (errors.recipient || errors.amount) {
          throw errors.recipient || errors.amount;
        }

        // Prepare swap app to receive the tx to forward.
        await swap.setPartnerKey(providerNameAndSignature.nameAndPubkey);
        await swap.checkPartner(providerNameAndSignature.signature);
        await swap.processTransaction(
          Buffer.from(swapResult.binaryPayload, "hex"),
          estimatedFees
        );
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

        if (unsubscribed) return;
        o.next({ type: "init-swap-requested" });
        await swap.checkRefundAddress(
          refundAddressConfig,
          refundAddressConfigSignature,
          refundAddressParameters.addressParameters
        );
        //await swap.signCoinTransaction();

        if (unsubscribed) return;
        o.next({
          type: "init-swap-result",
          initSwapResult: { transaction, swapId }
        });
      };
      confirmSwap().then(
        () => o.complete(),
        e => {
          o.error(e);
          unsubscribed = true;
        }
      );
      return () => {
        unsubscribed = true;
      };
    })
  );
};

// NB If any of the swap interactions fail it throws an error, maybe we can remap
// those errors to handle them differently.
// TODO test timedout rates

export default initSwap;
