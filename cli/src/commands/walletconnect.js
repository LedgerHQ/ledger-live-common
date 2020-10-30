// @flow
/* eslint-disable no-console */
/* eslint-disable no-fallthrough */
import { scan, scanCommonOpts } from "../scan";
import type { ScanCommonOpts } from "../scan";
import { from } from "rxjs";
import { first, tap, map, take } from "rxjs/operators";
import { Observable } from "rxjs";
import { log, listen } from "@ledgerhq/logs";
import WalletConnect from "@walletconnect/client";
import { getAccountBridge } from "@ledgerhq/live-common/lib/bridge";
import { withDevice } from "@ledgerhq/live-common/lib/hw/deviceAccess";
import signMessage from "@ledgerhq/live-common/lib/hw/signMessage";
import { convertHexToNumber } from "@walletconnect/utils";
import { BigNumber } from "bignumber.js";
import { getCryptoCurrencyById } from "@ledgerhq/live-common/lib/currencies";

type Opts = ScanCommonOpts &
  $Shape<{
    walletConnectURI: string,
    walletConnectSession: string,
    verbose: boolean,
    silent: boolean,
  }>;

export default {
  description: "Create a walletconnect session",
  args: [
    ...scanCommonOpts,
    {
      name: "walletConnectURI",
      type: String,
      desc: "WallecConnect URI to use.",
    },
    {
      name: "walletConnectSession",
      type: String,
      desc: "WallecConnect Session to use.",
    },
    {
      name: "verbose",
      alias: "v",
      type: Boolean,
      desc: "verbose mode",
    },
    {
      name: "silent",
      type: Boolean,
      desc: "do not output the proxy logs",
    },
  ],
  job: (opts: Opts) =>
    Observable.create(async (o) => {
      const unsub = listen((l: any) => {
        if (opts.verbose) {
          o.next(l.type + ": " + l.message);
        } else if (!opts.silent && l.type === "walletconnect") {
          o.next(l.message);
        }
      });

      let account = await scan(opts).pipe(take(1)).toPromise();

      if (!account) {
        throw new Error("No account");
      }

      log("walletconnect", account);

      const connector = new WalletConnect(
        opts.walletConnectSession
          ? {
              session: JSON.parse(opts.walletConnectSession),
            }
          : {
              // Required
              uri: opts.walletConnectURI,
              // Required
              clientMeta: {
                description: "LedgerLive CLI",
                url: "https://ledger.fr",
                icons: [
                  "https://avatars0.githubusercontent.com/u/9784193?s=400&v=4",
                ],
                name: "LedgerLive CLI",
              },
            }
      );

      connector.on("session_request", (error, payload) => {
        if (error) {
          throw error;
        }

        log("walletconnect", "session_request");
        log("walletconnect", payload);

        connector.approveSession({
          accounts: [account.freshAddress],
          chainId: account.currency.ethereumLikeInfo.chainId,
        });
      });

      connector.on("call_request", async (error, payload) => {
        if (error) {
          throw error;
        }

        log("walletconnect", "call_request");
        log("walletconnect", payload);

        let transactionRaw;
        let message;
        let errorMsg;
        let result;

        try {
          switch (payload.method) {
            case "eth_sign":
              payload.params = payload.params.reverse();
            case "personal_sign":
              message = {
                path: account.freshAddressPath,
                message: Buffer.from(
                  payload.params[0].slice(2),
                  "hex"
                ).toString(),
                currency: getCryptoCurrencyById("ethereum"),
                derivationMode: account.derivationMode,
              };

              log("walletconnect", "message to sign");
              log("walletconnect", (message: any));

              result = await withDevice(opts.device || "")((t) =>
                from(signMessage(t, message))
              )
                .pipe(take(1))
                .toPromise();
              result = result.signature;

              log("walletconnect", "message signature");
              log("walletconnect", result);

              break;
            case "eth_signTransaction":
            case "eth_sendTransaction":
              transactionRaw = payload.params[0];

              if (
                account.freshAddress.toLowerCase() ===
                transactionRaw.from.toLowerCase()
              ) {
                const bridge = getAccountBridge(account);
                let transaction = bridge.createTransaction(account);

                transaction = bridge.updateTransaction(transaction, {
                  data: Buffer.from(transactionRaw.data.slice(2), "hex"),
                });

                if (transactionRaw.value) {
                  transaction = bridge.updateTransaction(transaction, {
                    amount: BigNumber(transactionRaw.value, 16),
                  });
                }
                if (transactionRaw.to) {
                  transaction = bridge.updateTransaction(transaction, {
                    recipient: transactionRaw.to,
                  });
                }
                if (transactionRaw.gas) {
                  transaction = bridge.updateTransaction(transaction, {
                    userGasLimit: BigNumber(transactionRaw.gas, 16),
                  });
                }
                if (transactionRaw.gasPrice) {
                  transaction = bridge.updateTransaction(transaction, {
                    gasPrice: BigNumber(transactionRaw.gasPrice, 16),
                  });
                }
                if (transactionRaw.nonce) {
                  transaction = bridge.updateTransaction(transaction, {
                    nonce: transactionRaw.nonce,
                  });
                }

                transaction = await bridge.prepareTransaction(
                  account,
                  transaction
                );

                log("walletconnect", "transaction to sign");
                log("walletconnect", transaction);

                const signedOperation = await bridge
                  .signOperation({
                    account,
                    deviceId: opts.device || "",
                    transaction,
                  })
                  .pipe(
                    tap((e) => console.log(e)),
                    first((e) => e.type === "signed"),
                    map((e) => e.signedOperation)
                  )
                  .toPromise();

                log("walletconnect", "operation");
                log("walletconnect", signedOperation);

                if (payload.type === "eth_signTransaction") {
                  result = signedOperation.signature;
                  break;
                }

                const operation = await bridge.broadcast({
                  account,
                  signedOperation,
                });

                log("walletconnect", "operation broadcasted");
                log("walletconnect", (operation: any));

                result = operation.hash;
              } else {
                errorMsg = "Address requested does not match active account";
              }
              break;
            default:
              break;
          }
        } catch (e) {
          log("walletconnect", "error");
          log("walletconnect", e);
          errorMsg = e.message;
        }

        if (result) {
          const approval: any = {
            id: payload.id,
            result,
          };

          log("walletconnect", "approved");
          log("walletconnect", approval);

          connector.approveRequest(approval);
        } else {
          let message = "JSON RPC method not supported";
          if (errorMsg) {
            message = errorMsg;
          }

          const rejection: any = {
            id: payload.id,
            error: { message },
          };

          log("walletconnect", "rejected");
          log("walletconnect", rejection);

          connector.rejectRequest({
            id: payload.id,
            error: { message },
          });
        }
      });

      connector.on("connect", (error) => {
        if (error) {
          throw error;
        }

        log("walletconnect", "connected");
        log(
          "walletconnect",
          JSON.stringify(connector.session).replace(/"/g, `\\"`)
        );
      });

      return () => {
        unsub();
      };
    }),
};
