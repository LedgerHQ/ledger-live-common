import { from, Observable } from "rxjs";
import { TransportStatusError, WrongDeviceForAccount } from "@ledgerhq/errors";

import { delay } from "../../promise";
import ExchangeTransport from "../hw-app-exchange/Exchange";
import perFamily from "../../generated/exchange";
import { getAccountCurrency, getMainAccount } from "../../account";
import { getAccountBridge } from "../../bridge";
import { TransactionRefusedOnDevice } from "../../errors";
import { withDevice } from "../../hw/deviceAccess";
import { getCurrencyExchangeConfig } from "../";
import { getProvider } from "./";

import type {
  CompleteExchangeInputFund,
  CompleteExchangeRequestEvent,
} from "../platform/types";

const withDevicePromise = (deviceId, fn) =>
  withDevice(deviceId)((transport) => from(fn(transport))).toPromise();

const completeExchange = (
  input: CompleteExchangeInputFund
): Observable<CompleteExchangeRequestEvent> => {
  let { transaction } = input; // TODO build a tx from the data

  const {
    deviceId,
    exchange,
    provider,
    binaryPayload,
    signature,
    exchangeType,
    rateType, // TODO Pass fixed/float for UI switch ?
  } = input;

  const { fromAccount, fromParentAccount } = exchange;

  return new Observable((o) => {
    let unsubscribed = false;
    let ignoreTransportError = false;

    const confirmExchange = async () => {
      await withDevicePromise(deviceId, async (transport) => {
        const providerNameAndSignature = getProvider(provider);

        if (!providerNameAndSignature)
          throw new Error("Could not get provider infos");

        const exchange = new ExchangeTransport(
          transport,
          exchangeType,
          rateType
        );
        const refundAccount = getMainAccount(fromAccount, fromParentAccount);

        const accountBridge = getAccountBridge(refundAccount);

        const refundCurrency = getAccountCurrency(refundAccount);

        if (refundCurrency.type !== "CryptoCurrency")
          throw new Error("This should be a cryptocurrency");

        transaction = await accountBridge.prepareTransaction(
          refundAccount,
          transaction
        );
        if (unsubscribed) return;

        const { errors, estimatedFees } =
          await accountBridge.getTransactionStatus(refundAccount, transaction);
        if (unsubscribed) return;

        const errorsKeys = Object.keys(errors);

        if (errorsKeys.length > 0) throw errors[errorsKeys[0]]; // throw the first error

        await exchange.setPartnerKey(providerNameAndSignature.nameAndPubkey);

        if (unsubscribed) return;

        await exchange.checkPartner(providerNameAndSignature.signature);

        if (unsubscribed) return;

        await exchange.processTransaction(
          Buffer.from(binaryPayload, "ascii"),
          estimatedFees
        );

        if (unsubscribed) return;

        const goodSign = Buffer.from(signature, "base64");

        if (!goodSign) {
          throw new Error("Could not check provider signature");
        }

        await exchange.checkTransactionSignature(goodSign);
        if (unsubscribed) return;

        const payoutAddressParameters = await perFamily[
          refundCurrency.family
        ].getSerializedAddressParameters(
          refundAccount.freshAddressPath,
          refundAccount.derivationMode,
          refundCurrency.id
        );
        if (unsubscribed) return;

        const {
          config: payoutAddressConfig,
          signature: payoutAddressConfigSignature,
        } = getCurrencyExchangeConfig(refundCurrency);

        try {
          await exchange.checkPayoutAddress(
            payoutAddressConfig,
            payoutAddressConfigSignature,
            payoutAddressParameters.addressParameters
          );
        } catch (e) {
          // @ts-expect-error TransportStatusError to be typed on ledgerjs
          if (e instanceof TransportStatusError && e.statusCode === 0x6a83) {
            throw new WrongDeviceForAccount(undefined, {
              accountName: refundAccount.name,
            });
          }

          throw e;
        }

        o.next({
          type: "complete-exchange-requested",
          estimatedFees,
        });

        if (unsubscribed) return;
        ignoreTransportError = true;
        await exchange.signCoinTransaction();
      }).catch((e) => {
        if (ignoreTransportError) return;

        // @ts-expect-error TransportStatusError to be typed on ledgerjs
        if (e instanceof TransportStatusError && e.statusCode === 0x6a84) {
          throw new TransactionRefusedOnDevice();
        }

        throw e;
      });
      await delay(3000);
      if (unsubscribed) return;
      o.next({
        type: "complete-exchange-result",
        completeExchangeResult: transaction,
      });
    };

    confirmExchange().then(
      () => {
        o.complete();
        unsubscribed = true;
      },
      (e) => {
        o.next({
          type: "complete-exchange-error",
          error: e,
        });
        o.complete();
        unsubscribed = true;
      }
    );
    return () => {
      unsubscribed = true;
    };
  });
};

export default completeExchange;
