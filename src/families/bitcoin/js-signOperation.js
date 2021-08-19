// @flow

import { BigNumber } from "bignumber.js";
import { Observable } from "rxjs";

import Btc from "@ledgerhq/hw-app-btc";
import { log } from "@ledgerhq/logs";

import type { Account, Operation, SignOperationEvent } from "./../../types";
import { isSegwitDerivationMode } from "./../../derivation";
import { encodeOperationId } from "./../../operation";
import { open, close } from "./../../hw";

import type { Transaction } from "./types";
import { getNetworkParameters } from "./networks";
import { buildTransaction } from "./js-buildTransation";
import { calculateFees } from "./cache";
import wallet, { getWalletAccount } from "./wallet";
import { perCoinLogic } from "./logic";

const signOperation = ({
  account,
  deviceId,
  transaction,
}: {
  account: Account,
  deviceId: *,
  transaction: Transaction,
}): Observable<SignOperationEvent> =>
  Observable.create((o) => {
    async function main() {
      console.log("XXX - signOperation - START");

      const { currency } = account;
      const transport = await open(deviceId);
      const hwApp = new Btc(transport);

      const walletAccount = await getWalletAccount(account);

      try {
        log("hw", `signTransaction ${currency.id} for account ${account.id}`);

        const txInfo = await buildTransaction(account, transaction);

        let senders = [];
        let recipients = [];
        let fee = BigNumber(0);
        await calculateFees({ account, transaction }).then((res) => {
          senders = res.txInputs.map((i) => i.address).filter(Boolean);
          recipients = res.txOutputs.map((o) => o.address).filter(Boolean);
          fee = res.fees;
        });

        // FIXME Can't do without wallet-btc providing change path in outputs
        /*
        let changePath;
        for (const output of outputs) {
          //const output = await parseBitcoinOutput(o);
          if (output.isChange) {
            changePath = output.path || undefined;
          }
        }
        */

        // FIXME (legacy)
        // should be `transaction.getLockTime()` as soon as lock time is
        // handled by libcore (actually: it always returns a default value
        // and that caused issue with zcash (see #904))
        // cf. https://github.com/LedgerHQ/lib-ledger-core/blob/fc9d762b83fc2b269d072b662065747a64ab2816/core/src/wallet/bitcoin/transaction_builders/BitcoinLikeUtxoPicker.cpp#L156-L159
        let lockTime;

        // (legacy) Set lockTime for Komodo to enable reward claiming on UTXOs created by
        // Ledger Live. We should only set this if the currency is Komodo and
        // lockTime isn't already defined.
        if (currency.id === "komodo" && lockTime === undefined) {
          const unixtime = Math.floor(Date.now() / 1000);
          lockTime = unixtime - 777;
        }

        const networkParams = getNetworkParameters(currency.id);
        const sigHashTypeHex = networkParams.sigHash;
        console.log("XXX - signOperation - sigHashTypeHex:", sigHashTypeHex);
        const sigHashType = parseInt(sigHashTypeHex, 16);
        console.log("XXX - signOperation - sigHashType:", sigHashType);
        if (isNaN(sigHashType)) {
          throw new Error("sigHashType should not be NaN");
        }

        // FIXME Check if derivation mode of recipient instead of sender
        const segwit = isSegwitDerivationMode(account.derivationMode);

        // FIXME Call to explorer needed to set timestamp
        // cf. https://github.com/LedgerHQ/lib-ledger-core/blob/fc9d762b83fc2b269d072b662065747a64ab2816/core/src/wallet/bitcoin/transaction_builders/BitcoinLikeUtxoPicker.cpp#L150-L154
        /*
        const hasTimestamp = networkParams.usesTimestampedTransaction;
        const initialTimestamp = hasTimestamp
          ? transaction.timestamp
          : undefined;
        */

        const perCoin = perCoinLogic[currency.id];

        let additionals = [currency.id];
        if (account.derivationMode === "native_segwit") {
          additionals.push("bech32");
        }
        if (perCoin?.getAdditionals) {
          additionals = additionals.concat(
            perCoin.getAdditionals({ transaction })
          );
        }

        const expiryHeight = perCoin?.hasExpiryHeight
          ? Buffer.from([0x00, 0x00, 0x00, 0x00])
          : undefined;

        console.log("XXX - sign operation - signAccountTx params:", {
          btc: hwApp,
          fromAccount: walletAccount,
          txInfo,
          //changePath,
          lockTime,
          sigHashType,
          segwit,
          //initialTimestamp,
          additionals,
          expiryHeight,
        });

        const signature = await wallet.signAccountTx({
          btc: hwApp,
          fromAccount: walletAccount,
          txInfo,
          //changePath,
          lockTime,
          sigHashType,
          segwit,
          //initialTimestamp,
          additionals,
          expiryHeight,
          onDeviceSignatureGranted: () =>
            o.next({ type: "device-signature-granted" }),
          onDeviceSignatureRequested: () =>
            o.next({ type: "device-signature-requested" }),
          onDeviceStreaming: ({ progress, index, total }) =>
            o.next({ type: "device-streaming", progress, index, total }),
        });

        // Build the optimistic operation
        const operation: $Exact<Operation> = {
          id: encodeOperationId(account.id, "", "OUT"),
          hash: "", // Will be resolved in broadcast()
          type: "OUT",
          value: BigNumber(transaction.amount).plus(fee),
          fee,
          blockHash: null,
          blockHeight: null,
          senders,
          recipients,
          accountId: account.id,
          date: new Date(),
          extra: {},
        };

        o.next({
          type: "signed",
          signedOperation: {
            operation,
            signature,
            expirationDate: null,
          },
        });
        console.log("XXX - signOperation - END");
      } finally {
        close(transport, deviceId);
      }
    }
    main().then(
      () => o.complete(),
      (e) => o.error(e)
    );
  });

export default signOperation;
