// @flow
import { AccountResponse, Server } from "stellar-sdk";
import { BigNumber } from "bignumber.js";
import { formatCurrencyUnit, parseCurrencyUnit } from "../../../currencies";
import { getCryptoCurrencyById } from "../../../data/cryptocurrencies";
import signTransaction from "../../../hw/signTransaction";
import {
  Asset,
  Networks,
  Transaction as StrTransaction,
  StrKey
} from "stellar-base";
import { open } from "../../../hw";

const stellarUnit = getCryptoCurrencyById("stellar").units[0];

const getServer = (_: any) => {
  // if (getEnv("STELLAR_USE_TESTNET")) {
  //   return new Server("https://horizon-testnet.stellar.org");
  // }
  return new Server("https://horizon.stellar.org");
};

export const parseAPIValue = (value: string) => {
  if (!value) {
    return new BigNumber(0);
  }
  return parseCurrencyUnit(stellarUnit, `${value}`);
};

const formatAPICurrency = (amount: BigNumber) =>
  formatCurrencyUnit(stellarUnit, amount, {
    showAllDigits: true,
    disableRounding: true,
    useGrouping: false
  });

export default {
  formatAPICurrency,
  parseAPIValue,
  getBalanceFromAccount: (accountResponse: AccountResponse) => {
    let balance = new BigNumber(0);

    if (
      Array.isArray(accountResponse.balances) &&
      accountResponse.balances.length > 0
    ) {
      const nativeBalance = accountResponse.balances.find(
        b => b.asset_type === "native"
      );
      if (nativeBalance) {
        balance = parseCurrencyUnit(stellarUnit, `${nativeBalance.balance}`);
      }
    }
    return balance;
  },
  isValidRecipient: (recipient: string) =>
    StrKey.isValidEd25519PublicKey(recipient),
  doSignAndBroadcast: async ({
                               a,
                               t,
                               deviceId,
                               isCancelled,
                               onSigned,
                               onOperationBroadcasted
                             }: any) => {
    const transport = await open(deviceId);
    const signedTransactionXDR = await signTransaction(
      a.currency,
      transport,
      a.freshAddressPath,
      {
        freshAddress: a.freshAddress,
        destination: t.recipient,
        asset: Asset.native(),
        memo: t.memo,
        memoType: (t.memoType && t.memoType.value) || "MEMO_NONE",
        fee: formatAPICurrency(t.fee),
        amount: formatAPICurrency(t.amount)
      }
    );
    const signedTransaction = new StrTransaction(
      signedTransactionXDR,
      Networks.PUBLIC
    );

    if (!isCancelled()) {
      onSigned();
      const transactionResult = await getServer().submitTransaction(
        signedTransaction
      );
      onOperationBroadcasted({
        id: `${a.id}-${transactionResult.hash}-OUT`,
        hash: transactionResult.hash,
        accountId: a.id,
        type: "OUT",
        value: new BigNumber(t.amount),
        fee: new BigNumber(signedTransaction.fee),
        blockHash: null,
        blockHeight: null,
        senders: [signedTransaction.source],
        recipients: [t.recipient],
        date: new Date(),
        transactionSequenceNumber:
          (a.operations.length > 0
            ? a.operations[0].transactionSequenceNumber
            : 0) + a.pendingOperations.length
      });
    }
  },
  getBaseFee: async () => {
    try {
      return await getServer().fetchBaseFee();
    } catch (e) {
      return 100;
    }
  },
  getLastLedger: async () => {
    return await getServer()
      .ledgers()
      .limit(1)
      .order("desc")
      .call();
  },
  getServer
};
