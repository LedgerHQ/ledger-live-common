import { from, Observable } from "rxjs";
import { TransportStatusError, WrongDeviceForAccount } from "@ledgerhq/errors";

import { delay } from "../../promise";
import ExchangeTransport from "../hw-app-exchange/Exchange";
import perFamily from "../../generated/exchange";
import { getAccountCurrency, getMainAccount } from "../../account";
import { getAccountBridge } from "../../bridge";
import { TransactionRefusedOnDevice } from "../../errors";
import { withDevice } from "../../hw/deviceAccess";
// import { getCurrencyExchangeConfig } from "../";
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
          Buffer.from(binaryPayload, "hex"),
          estimatedFees
        );
        if (unsubscribed) return;

        const goodSign = Buffer.from(signature, "hex");

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

        // FIXME: use test BTC config untill app-exchange updated
        // cf. https://github.com/LedgerHQ/app-exchange/blob/banx/test/src/common.js#L45-L46

        // const {
        //   config: payoutAddressConfig,
        //   signature: payoutAddressConfigSignature,
        // } = getCurrencyExchangeConfig(refundCurrency);

        const payoutAddressConfig = Buffer.from([
          0x3, 0x42, 0x54, 0x43, 0x7, 0x42, 0x69, 0x74, 0x63, 0x6f, 0x69, 0x6e,
          0x0,
        ]);
        const payoutAddressConfigSignature = Buffer.from([
          0x30, 0x45, 0x2, 0x21, 0x0, 0xcb, 0x17, 0x43, 0x82, 0x30, 0x22, 0x19,
          0xdc, 0xa3, 0x59, 0xc0, 0xa4, 0xd4, 0x57, 0xb2, 0x56, 0x9e, 0x31,
          0xa0, 0x6b, 0x2c, 0x25, 0xc0, 0x8, 0x8a, 0x2b, 0xd3, 0xfd, 0x6c, 0x4,
          0x38, 0x6a, 0x2, 0x20, 0x2c, 0x6d, 0xa, 0x5b, 0x92, 0x4a, 0x41, 0x46,
          0x21, 0x6, 0x7e, 0x31, 0x6f, 0x2, 0x1a, 0xa1, 0x3a, 0xa5, 0xb2, 0xee,
          0xe2, 0xbf, 0x36, 0xea, 0x3c, 0xfd, 0xde, 0xbc, 0x5, 0x3b, 0x20, 0x1b,
        ]);

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
