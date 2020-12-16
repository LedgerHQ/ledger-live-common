// @flow

import type { CryptoCurrency, Account, Operation } from "../../types";
import type { CoreOperation } from "../../libcore/types";
import {
  parseBitcoinInput,
  parseBitcoinOutput,
  perCoinLogic,
} from "./transaction";

async function bitcoinBuildOperation(
  {
    coreOperation,
    existingAccount,
    currency,
  }: {
    coreOperation: CoreOperation,
    existingAccount: ?Account,
    currency: CryptoCurrency,
  },
  partialOp: Operation
) {
  const bitcoinLikeOperation = await coreOperation.asBitcoinLikeOperation();
  const bitcoinLikeTransaction = await bitcoinLikeOperation.getTransaction();
  const hash = await bitcoinLikeTransaction.getHash();

  const shape: $Shape<Operation> = { hash };

  const perCoin = perCoinLogic[currency.id];
  if (perCoin && perCoin.syncReplaceAddress) {
    const { syncReplaceAddress } = perCoin;
    shape.senders = partialOp.senders.map((addr) =>
      syncReplaceAddress(existingAccount, addr)
    );
    shape.recipients = partialOp.recipients.map((addr) =>
      syncReplaceAddress(existingAccount, addr)
    );
  }

  const inputs = await Promise.all(
    (await bitcoinLikeTransaction.getInputs()).map(
      async (libcoreInput) => await parseBitcoinInput(libcoreInput)
    )
  );
  const outputs = await Promise.all(
    (await bitcoinLikeTransaction.getOutputs()).map(
      async (libcoreOutput) => await parseBitcoinOutput(libcoreOutput)
    )
  );

  shape.transaction = {
    inputs,
    outputs,
  };

  return shape;
}

export default bitcoinBuildOperation;
