import type { Account as WalletAccount } from "@ledgerhq/wallet-btc";
import { CoinSelect, DeepFirst, Merge } from "@ledgerhq/wallet-btc";
import type { TransactionInfo as WalletTxInfo } from "@ledgerhq/wallet-btc";
import { FeeNotLoaded } from "@ledgerhq/errors";

import type { Account } from "../../types";
import type { Transaction, UtxoStrategy } from "./types";
import { bitcoinPickingStrategy } from "./types";
import wallet, { getWalletAccount } from "./wallet";

const selectUtxoPickingStrategy = (
  walletAccount: WalletAccount,
  utxoStrategy: UtxoStrategy
) => {
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
    // Definition of replaceable, per the standard: https://github.com/bitcoin/bips/blob/61ccc84930051e5b4a99926510d0db4a8475a4e6/bip-0125.mediawiki#summary
    sequence: transaction.rbf ? 0 : 0xffffffff,
  });
  return txInfo;
};
