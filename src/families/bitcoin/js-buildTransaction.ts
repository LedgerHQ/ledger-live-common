import type { Account as WalletAccount } from "wallet-btc";
import { CoinSelect, DeepFirst, Merge } from "wallet-btc";
import type { TransactionInfo as WalletTxInfo } from "wallet-btc";
import { FeeNotLoaded } from "@ledgerhq/errors";

import type { Account } from "../../types";
import type { Transaction, BitcoinPickingStrategy } from "./types";
import { bitcoinPickingStrategy } from "./types";
import wallet, { getWalletAccount } from "./wallet";

// TODO Test all strategies
const selectUtxoPickingStrategy = (
  walletAccount: WalletAccount,
  utxoStrategy: BitcoinPickingStrategy
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
  if (!transaction.feePerByte) {
    throw new FeeNotLoaded();
  }
  const walletAccount = await getWalletAccount(account);
  const utxoPickingStrategy = selectUtxoPickingStrategy(
    walletAccount,
    transaction.utxoStrategy.strategy
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
