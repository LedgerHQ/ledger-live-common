// @flow
import type {
  Account as WalletAccount,
  TransactionInfo as WalletTxInfo,
} from "wallet-btc";
//const { PickingStrategy } = require("wallet-btc/pickingstrategies/types");
const { CoinSelect } = require("wallet-btc/dist/pickingstrategies/CoinSelect");
const { DeepFirst } = require("wallet-btc/dist/pickingstrategies/DeepFirst");
const { Merge } = require("wallet-btc/dist/pickingstrategies/Merge");

import type { Account } from "../../types";
import type { Transaction } from "./types";
import { bitcoinPickingStrategy } from "./types";
import wallet, { getWalletAccount } from "./wallet";

// TODO Test all strategies
const selectUtxoPickingStrategy = (
  walletAccount: WalletAccount,
  utxoStrategy: bitcoinPickingStrategy
) => {
  if (utxoStrategy === bitcoinPickingStrategy.MERGE_OUTPUTS) {
    return new Merge(
      walletAccount.xpub.crypto,
      walletAccount.xpub.derivationMode
    );
  } else if (utxoStrategy === bitcoinPickingStrategy.DEEP_OUTPUTS_FIRST) {
    return new DeepFirst(
      walletAccount.xpub.crypto,
      walletAccount.xpub.derivationMode
    );
  } else if (utxoStrategy === bitcoinPickingStrategy.OPTIMIZE_SIZE) {
    // FIXME Is the mapping OPTIMIZE_SIZE <> CoinSelect correct??
    return new CoinSelect(
      walletAccount.xpub.crypto,
      walletAccount.xpub.derivationMode
    );
  } else {
    throw new Error("Unsupported Bitcoin UTXO picking strategy");
  }
};

export const buildTransaction = async (
  account: Account,
  transaction: Transaction
): Promise<WalletTxInfo> => {
  console.log("XXX - buildTransaction - START");

  const walletAccount = await getWalletAccount(account);

  const utxoPickingStrategy = selectUtxoPickingStrategy(
    walletAccount,
    transaction.utxoStrategy.strategy
  );

  const txInfo = await wallet.buildAccountTx({
    fromAccount: walletAccount,
    dest: transaction.recipient,
    amount: transaction.amount,
    feePerByte: transaction.feePerByte,
    utxoPickingStrategy,
    sequence: transaction.rbf ? 0 : 0xffffffff,
  });

  console.log("XXX - buildTransaction - END");
  return txInfo;
};
