import { log } from "@ledgerhq/logs";
import { from } from "rxjs";
import secp256k1 from "secp256k1";
import { TransportStatusError, WrongDeviceForAccount } from "@ledgerhq/errors";
import { delay } from "../../promise";
import ExchangeTransport, {
  TRANSACTION_TYPES,
} from "../hw-app-exchange/Exchange";
import perFamily from "../../generated/exchange";
import { getAccountCurrency, getMainAccount } from "../../account";
import { getAccountBridge } from "../../bridge";
import { TransactionRefusedOnDevice } from "../../errors";

import { Observable } from "rxjs";
import { withDevice } from "../../hw/deviceAccess";

import { getCurrencyExchangeConfig } from "../";
import type { Transaction } from "../../types";
import type { CompleteExchangeRequestEvent, Exchange } from "./types";

import { getProviderNameAndSignature as getProviderNameAndSignatureSwap } from "../swap";
import { getProvider as getProviderNameAndSignatureSell } from "../sell";

const withDevicePromise = (deviceId, fn) =>
  withDevice(deviceId)((transport) => from(fn(transport))).toPromise();

type CompleteExchangeInput = {
  exchange: Exchange;
  deviceId: string;
  provider: string;
  binaryPayload: string;
  signature: string;
  transaction: Transaction;
  exchangeType: number;
  rateType: number;
};

const getProviderNameAndSignature =
  (exchangeType: number) => (provider: string) => {
    switch (exchangeType) {
      case TRANSACTION_TYPES.SWAP:
        return getProviderNameAndSignatureSwap(provider);

      case TRANSACTION_TYPES.SELL:
        return getProviderNameAndSignatureSell(provider);
    }
  };

const getGoodSignature = (exchangeType: number) => (signature: string) => {
  switch (exchangeType) {
    case TRANSACTION_TYPES.SWAP:
      return <Buffer>secp256k1.signatureExport(Buffer.from(signature, "hex"));

    case TRANSACTION_TYPES.SELL:
      return Buffer.from(signature, "base64");
  }
};

const completeExchange = (
  input: CompleteExchangeInput
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
  const { toAccount, toParentAccount } = exchange;

  return new Observable((o) => {
    let unsubscribed = false;
    let ignoreTransportError = false;

    const confirmExchange = async () => {
      await withDevicePromise(deviceId, async (transport) => {
        const providerNameAndSignature =
          getProviderNameAndSignature(exchangeType)(provider);

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
          Buffer.from(
            binaryPayload,
            exchangeType === TRANSACTION_TYPES.SWAP ? "hex" : "ascii"
          ),
          estimatedFees
        );
        if (unsubscribed) return;

        const goodSign = getGoodSignature(exchangeType)(signature);
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
        if (exchangeType === TRANSACTION_TYPES.SWAP) {
          // Swap specific checks to confirm the refund address is correct.
          if (!toAccount) {
            throw new Error("toAccount requested for SWAP exchange type");
          }

          const payoutAccount = getMainAccount(toAccount, toParentAccount);
          const mainPayoutCurrency = getAccountCurrency(payoutAccount);

          if (mainPayoutCurrency.type !== "CryptoCurrency")
            throw new Error("This should be a cryptocurrency");

          if (unsubscribed) return;
          const refundAddressParameters = await perFamily[
            mainPayoutCurrency.family
          ].getSerializedAddressParameters(
            payoutAccount.freshAddressPath,
            payoutAccount.derivationMode,
            mainPayoutCurrency.id
          );
          if (unsubscribed) return;

          const {
            config: refundAddressConfig,
            signature: refundAddressConfigSignature,
          } = getCurrencyExchangeConfig(refundCurrency);
          if (unsubscribed) return;

          try {
            await exchange.checkRefundAddress(
              refundAddressConfig,
              refundAddressConfigSignature,
              refundAddressParameters.addressParameters
            );
            log("exchange", "checkrefund address");
          } catch (e) {
            // @ts-expect-error TransportStatusError to be typed on ledgerjs
            if (e instanceof TransportStatusError && e.statusCode === 0x6a83) {
              log("exchange", "transport error");
              throw new WrongDeviceForAccount(undefined, {
                accountName: refundAccount.name,
              });
            }
            throw e;
          }
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
