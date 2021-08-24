import type { Account as WalletAccount } from "wallet-btc";
import { CoinSelect, DeepFirst, Merge } from "wallet-btc";
import type { TransactionInfo as WalletTxInfo } from "wallet-btc";
import { FeeNotLoaded } from "@ledgerhq/errors";

import type { Account } from "../../types";
import type { Transaction, UtxoStrategy } from "./types";
import { bitcoinPickingStrategy } from "./types";
import wallet, { getWalletAccount } from "./wallet";

// TODO Test all strategies
const selectUtxoPickingStrategy = (
  walletAccount: WalletAccount,
  utxoStrategy: UtxoStrategy
) => {
  // TODO Manage transaction.utxoStrategy.pickUnconfirmedRBF

  if (utxoStrategy.strategy === bitcoinPickingStrategy.MERGE_OUTPUTS) {
    return new Merge(
      walletAccount.xpub.crypto,
      walletAccount.xpub.derivationMode,
      utxoStrategy.excludeUTXOs
    );
  } else if (
    utxoStrategy.strategy === bitcoinPickingStrategy.DEEP_OUTPUTS_FIRST
  ) {
    return new DeepFirst(
      walletAccount.xpub.crypto,
      walletAccount.xpub.derivationMode,
      utxoStrategy.excludeUTXOs
    );
  } else if (utxoStrategy.strategy === bitcoinPickingStrategy.OPTIMIZE_SIZE) {
    return new CoinSelect(
      walletAccount.xpub.crypto,
      walletAccount.xpub.derivationMode,
      utxoStrategy.excludeUTXOs
    );
  } else {
    throw new Error("Unsupported Bitcoin UTXO picking strategy");
  }
};

export const buildTransaction = async (
  account: Account,
  transaction: Transaction
): Promise<WalletTxInfo> => {
  if (!transaction.feePerByte) {
    throw new FeeNotLoaded();
  }
  const walletAccount = await getWalletAccount(account);
  const utxoPickingStrategy = selectUtxoPickingStrategy(
    walletAccount,
    transaction.utxoStrategy
  );

  const txInfo = await wallet.buildAccountTx({
    fromAccount: walletAccount,
    dest: transaction.recipient,
    amount: transaction.amount,
    feePerByte: transaction.feePerByte.toNumber(), //!\ wallet-btc handles fees as JS number
    utxoPickingStrategy,
    sequence: transaction.rbf ? 0 : 0xffffffff,
  });
  return txInfo;
};
