import { Observable } from "rxjs";
import type {
  Account,
  Operation,
  OperationType,
  SignOperationEvent,
} from "../../types";
import { open, close } from "../../hw";
import type {
  Command,
  CreateAssociatedTokenAccountCommand,
  TokenTransferCommand,
  Transaction,
  TransferCommand,
  ValidCommandDescriptor,
} from "./types";
import { buildOnChainTransaction } from "./js-buildTransaction";
import Solana from "@ledgerhq/hw-app-solana";
import BigNumber from "bignumber.js";
import { encodeOperationId } from "../../operation";
import { assertUnreachable } from "./utils";

const buildOptimisticOperation = async (
  account: Account,
  transaction: Transaction
): Promise<Operation> => {
  const { state } = transaction;
  switch (state.kind) {
    case "prepared":
      const { commandDescriptor } = state;
      switch (commandDescriptor.status) {
        case "valid":
          return buildOptimisticOperationForCommand(
            account,
            transaction,
            commandDescriptor
          );
        case "invalid":
          throw new Error("unexpected transaction state");
        default:
          assertUnreachable(commandDescriptor);
      }
    case "unprepared":
      throw new Error("unexpected transaction state");
    default:
      return assertUnreachable(state);
  }
};

/**
 * Sign Transaction with Ledger hardware
 */
const signOperation = ({
  account,
  deviceId,
  transaction,
}: {
  account: Account;
  deviceId: any;
  transaction: Transaction;
}): Observable<SignOperationEvent> =>
  new Observable((subsriber) => {
    const main = async () => {
      const transport = await open(deviceId);

      try {
        const [msgToHardwareBytes, singOnChainTransaction] =
          await buildOnChainTransaction(account, transaction);

        const hwApp = new Solana(transport);

        subsriber.next({
          type: "device-signature-requested",
        });

        const { signature } = await hwApp.signTransaction(
          account.freshAddressPath,
          msgToHardwareBytes
        );

        subsriber.next({
          type: "device-signature-granted",
        });

        const singedOnChainTxBytes = singOnChainTransaction(signature);

        subsriber.next({
          type: "signed",
          signedOperation: {
            operation: await buildOptimisticOperation(account, transaction),
            signature: singedOnChainTxBytes.toString("hex"),
            expirationDate: null,
          },
        });
      } finally {
        close(transport, deviceId);
      }
    };

    main().then(
      () => subsriber.complete(),
      (e) => subsriber.error(e)
    );
  });

export default signOperation;

function buildOptimisticOperationForCommand(
  account: Account,
  transaction: Transaction,
  commandDescriptor: ValidCommandDescriptor<Command>
): Operation {
  switch (commandDescriptor.command.kind) {
    case "transfer":
      return optimisticOpForTransfer(
        account,
        transaction,
        commandDescriptor as ValidCommandDescriptor<TransferCommand>
      );
    case "token.transfer":
      return optimisticOpForTokenTransfer(
        account,
        transaction,
        commandDescriptor as ValidCommandDescriptor<TokenTransferCommand>
      );
    case "token.createAssociatedTokenAccount":
      type command = CreateAssociatedTokenAccountCommand;
      return optimisticOpForCATA(
        account,
        transaction,
        commandDescriptor as ValidCommandDescriptor<command>
      );
    default:
      return assertUnreachable(commandDescriptor.command);
  }
}
function optimisticOpForTransfer(
  account: Account,
  transaction: Transaction,
  commandDescriptor: ValidCommandDescriptor<TransferCommand>
): Operation {
  const { command } = commandDescriptor;
  return {
    ...optimisticOpcommons(transaction, commandDescriptor),
    id: encodeOperationId(account.id, "", "OUT"),
    type: "OUT",
    accountId: account.id,
    senders: [account.freshAddress],
    recipients: [transaction.recipient],
    value: new BigNumber(command.amount),
    extra: {
      memo: command.memo,
    },
  };
}

function optimisticOpForTokenTransfer(
  account: Account,
  transaction: Transaction,
  commandDescriptor: ValidCommandDescriptor<TokenTransferCommand>
): Operation {
  if (!transaction.subAccountId) {
    throw new Error("sub account id is required for token transfer");
  }
  const { command } = commandDescriptor;
  return {
    ...optimisticOpcommons(transaction, commandDescriptor),
    id: encodeOperationId(account.id, "", "FEES"),
    type: "FEES",
    accountId: account.id,
    senders: [account.freshAddress],
    recipients: [transaction.recipient],
    value: new BigNumber(command.amount),
    extra: {
      memo: command.memo,
    },
    subOperations: [
      {
        ...optimisticOpcommons(transaction, commandDescriptor),
        id: encodeOperationId(transaction.subAccountId, "", "OUT"),
        type: "OUT",
        accountId: transaction.subAccountId,
        senders: [account.freshAddress],
        recipients: [transaction.recipient],
        value: new BigNumber(command.amount),
        extra: {
          memo: command.memo,
        },
      },
    ],
  };
}

function optimisticOpForCATA(
  account: Account,
  transaction: Transaction,
  commandDescriptor: ValidCommandDescriptor<CreateAssociatedTokenAccountCommand>
): Operation {
  const opType: OperationType = "OPT_IN";

  return {
    ...optimisticOpcommons(transaction, commandDescriptor),
    id: encodeOperationId(account.id, "", opType),
    type: opType,
    accountId: account.id,
    senders: [],
    recipients: [],
    value: new BigNumber(commandDescriptor.fees ?? 0),
  };
}

function optimisticOpcommons(
  transaction: Transaction,
  commandDescriptor: ValidCommandDescriptor<Command>
) {
  if (!transaction.feeCalculator) {
    throw new Error("fee calculator is not loaded");
  }
  const fees =
    transaction.feeCalculator.lamportsPerSignature +
    (commandDescriptor.fees ?? 0);
  return {
    hash: "",
    fee: new BigNumber(fees),
    blockHash: null,
    blockHeight: null,
    date: new Date(),
    extra: {},
  };
}
