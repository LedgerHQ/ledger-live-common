// @flow

import { Observable, from, of } from "rxjs";
import { mergeMap } from "rxjs/operators";
import { BigNumber } from "bignumber.js";
import invariant from "invariant";
import eip55 from "eip55";
import EthereumTx from "ethereumjs-tx";
import { log } from "@ledgerhq/logs";
import { FeeNotLoaded } from "@ledgerhq/errors";
import Eth from "@ledgerhq/hw-app-eth";
import { byContractAddress } from "@ledgerhq/hw-app-eth/erc20";
import type { Transaction } from "./types";
import type {
  Operation,
  CryptoCurrency,
  Account,
  SignOperationEvent,
} from "../../types";
import { getGasLimit, serializeTransactionData } from "./transaction";
import { apiForCurrency } from "../../api/Ethereum";
import { withDevice } from "../../hw/deviceAccess";

// see https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md
function getNetworkId(currency: CryptoCurrency): ?number {
  switch (currency.id) {
    case "ethereum":
      return 1;
    case "ethereum_classic":
      return 61;
    case "ethereum_classic_ropsten":
      return 62;
    case "ethereum_ropsten":
      return 3;
    default:
      return null;
  }
}

/*
const signOperation = ({ account, transaction, deviceId }) => {
  const api = apiForCurrency(account.currency);

  return from(
    transaction.nonce !== undefined
      ? of(transaction.nonce)
      : api.getAccountNonce(freshAddress)
  ).pipe(
    mergeMap((nonce) =>
      concat(
         // of({ type: "device-signature-requested" }),
                  mergeMap((signature) =>
            of(
              { type: "device-signature-granted" },
              {
                type: "signed",
                signedOperation: {
                  signature,
                  expirationTime: null,
                  operation: {
                    id: `${accountId}--OUT`,
                    hash: "",
                    type: "OUT",
                    value: amount,
                    fee: gasPrice.times(gasLimit),
                    blockHeight: null,
                    blockHash: null,
                    accountId,
                    senders: [freshAddress],
                    recipients: [transaction.recipient],
                    transactionSequenceNumber: nonce,
                    date: new Date(),
                    extra: {},
                  },
                },
              }
            )
          )
        )
      )
    )
  );
};

*/

export const signOperation = ({
  account,
  deviceId,
  transaction,
}: {
  account: Account,
  deviceId: *,
  transaction: Transaction,
}): Observable<SignOperationEvent> =>
  from(
    transaction.nonce !== undefined
      ? of(transaction.nonce)
      : apiForCurrency(account.currency).getAccountNonce(account.freshAddress)
  ).pipe(
    mergeMap((nonce) =>
      withDevice(deviceId)((transport) =>
        Observable.create((o) => {
          let cancelled;

          async function main() {
            // First, we need to create a partial tx and send to the device
            const {
              subAccounts,
              currency,
              freshAddressPath,
              freshAddress,
            } = account;
            const { gasPrice } = transaction;
            const subAccount =
              transaction.subAccountId && subAccounts
                ? subAccounts.find((t) => t.id === transaction.subAccountId)
                : null;

            invariant(
              !subAccount || subAccount.type === "TokenAccount",
              "only token accounts expected"
            );

            const chainId = getNetworkId(currency);
            invariant(
              chainId,
              `chainId not found for currency ${currency.name}`
            );

            const gasLimit = getGasLimit(transaction);

            /*
  await isValidRecipient({
    currency: account.currency,
    recipient: transaction.recipient,
  });
  */

            if (!gasPrice || !gasLimit || !BigNumber(gasLimit).gt(0)) {
              log(
                "ethereum-error",
                "buildTransaction missingData: gasPrice=" +
                  String(gasPrice) +
                  " gasLimit=" +
                  String(gasLimit)
              );
              throw new FeeNotLoaded();
            }

            /*
  recipient: t.recipient,
  amount: `0x${BigNumber(t.amount).toString(16)}`,
  gasPrice: !t.gasPrice ? "0x00" : `0x${BigNumber(t.gasPrice).toString(16)}`,
  gasLimit: `0x${BigNumber(getGasLimit(t)).toString(16)}`,
  */
            ////////////////////////
            const ethTxObject: Object = {
              nonce,
              chainId,
              gasPrice: `0x${BigNumber(gasPrice).toString(16)}`,
              gasLimit: `0x${BigNumber(gasLimit).toString(16)}`,
            };

            if (transaction.mode === "send") {
              if (subAccount) {
                const { token } = subAccount;

                const data = serializeTransactionData(account, transaction);
                invariant(data, "serializeTransactionData provided no data");

                ethTxObject.data = "0x" + data.toString("hex");
                ethTxObject.to = token.contractAddress;
                ethTxObject.value = 0;
              } else {
                let amount;
                if (transaction.useAllAmount) {
                  amount = account.balance.minus(gasPrice.times(gasLimit));
                } else {
                  invariant(transaction.amount, "amount is missing");
                  amount = transaction.amount;
                }

                ethTxObject.value = `0x${BigNumber(amount).toString(16)}`;
                ethTxObject.to = eip55.encode(transaction.recipient);
              }
            } else {
              throw new Error(
                "unsupported transaction.type=" + transaction.mode
              );
            }

            const tx = new EthereumTx(ethTxObject);
            tx.raw[6] = Buffer.from([chainId]); // v
            tx.raw[7] = Buffer.from([]); // r
            tx.raw[8] = Buffer.from([]); // s

            const eth = new Eth(transport);

            if (cancelled) return;

            if (subAccount) {
              const { token } = subAccount;
              const tokenInfo = byContractAddress(token.contractAddress);
              invariant(
                tokenInfo,
                `contract ${token.contractAddress} data for ${token.id} ERC20 not found`
              );
              await eth.provideERC20TokenInformation(tokenInfo);
            }

            if (cancelled) return;

            o.next({ type: "device-signature-requested" });
            const result = await eth.signTransaction(
              freshAddressPath,
              tx.serialize().toString("hex")
            );
            o.next({ type: "device-signature-granted" });

            // Second, we re-set some tx fields from the device signature

            tx.v = Buffer.from(result.v, "hex");
            tx.r = Buffer.from(result.r, "hex");
            tx.s = Buffer.from(result.s, "hex");
            const signedChainId = Math.floor((tx.v[0] - 35) / 2); // EIP155: v should be chain_id * 2 + {35, 36}
            const validChainId = chainId & 0xff; // eslint-disable-line no-bitwise
            invariant(
              signedChainId === validChainId,
              `Invalid chainId signature returned. Expected: ${chainId}, Got: ${signedChainId}`
            );

            // Generate the signature ready to be broadcasted
            const signature = `0x${tx.serialize().toString("hex")}`;

            // build optimistic operation
            const txHash = ""; // resolved at broadcast time
            const senders = [freshAddress];
            const recipients = [ethTxObject.recipient];
            const fee = gasPrice.times(gasLimit);
            const transactionSequenceNumber = nonce;
            const accountId = account.id;

            const operation: $Exact<Operation> = {
              id: `${accountId}-${txHash}-OUT`,
              hash: txHash,
              transactionSequenceNumber,
              type: "OUT",
              value: ethTxObject.value,
              fee,
              blockHash: null,
              blockHeight: null,
              senders,
              recipients,
              accountId,
              date: new Date(),
              extra: {},
            };

            if (subAccount) {
              operation.subOperations = [
                {
                  id: `${subAccount.id}-${txHash}-OUT`,
                  hash: txHash,
                  transactionSequenceNumber,
                  type: "OUT",
                  value: transaction.useAllAmount
                    ? subAccount.balance
                    : BigNumber(transaction.amount || 0),
                  fee,
                  blockHash: null,
                  blockHeight: null,
                  senders,
                  recipients: [transaction.recipient],
                  accountId: subAccount.id,
                  date: new Date(),
                  extra: {},
                },
              ];
            }

            o.next({
              type: "signed",
              signedOperation: {
                operation,
                signature,
                expirationDate: null,
              },
            });
          }

          main().then(
            () => o.complete(),
            (e) => e.error(e)
          );

          return () => {
            cancelled = true;
          };
        })
      )
    )
  );
