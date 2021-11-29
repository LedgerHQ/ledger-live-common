import { Observable } from "rxjs";
import type {
  Account,
  Operation,
  OperationType,
  SignOperationEvent,
} from "../../types";
import { open, close } from "../../hw";
import type {
  TokenCreateATACommand,
  TokenTransferCommand,
  Transaction,
  TransferCommand,
  ValidCommandDescriptor,
} from "./types";
import { buildTransactionWithAPI } from "./js-buildTransaction";
import Solana from "@ledgerhq/hw-app-solana";
import BigNumber from "bignumber.js";
import { encodeOperationId } from "../../operation";
import { assertUnreachable } from "./utils";
import { ChainAPI } from "./api";

const buildOptimisticOperation = (
  account: Account,
  transaction: Transaction
): Operation => {
  if (transaction.model.commandDescriptor === undefined) {
    throw new Error("command descriptor is missing");
  }

  const { commandDescriptor } = transaction.model;

  switch (commandDescriptor.status) {
    case "valid":
      return buildOptimisticOperationForCommand(
        account,
        transaction,
        commandDescriptor
      );
    case "invalid":
      throw new Error("invalid command");
    default:
      return assertUnreachable(commandDescriptor);
  }
};

export const signOperationWithAPI = (
  {
    account,
    deviceId,
    transaction,
  }: {
    account: Account;
    deviceId: any;
    transaction: Transaction;
  },
  api: () => Promise<ChainAPI>
): Observable<SignOperationEvent> =>
  new Observable((subsriber) => {
    const main = async () => {
      const transport = await open(deviceId);

      try {
        const [msgToHardwareBytes, singOnChainTransaction] =
          await buildTransactionWithAPI(account, transaction, await api());

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
            operation: buildOptimisticOperation(account, transaction),
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

function buildOptimisticOperationForCommand(
  account: Account,
  transaction: Transaction,
  commandDescriptor: ValidCommandDescriptor
): Operation {
  const { command } = commandDescriptor;
  switch (command.kind) {
    case "transfer":
      return optimisticOpForTransfer(
        account,
        transaction,
        command,
        commandDescriptor
      );
    case "token.transfer":
      return optimisticOpForTokenTransfer(
        account,
        transaction,
        command,
        commandDescriptor
      );
    case "token.createATA":
      return optimisticOpForCATA(
        account,
        transaction,
        command,
        commandDescriptor
      );
    default:
      return assertUnreachable(command);
  }
}
function optimisticOpForTransfer(
  account: Account,
  transaction: Transaction,
  command: TransferCommand,
  commandDescriptor: ValidCommandDescriptor
): Operation {
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
  command: TokenTransferCommand,
  commandDescriptor: ValidCommandDescriptor
): Operation {
  if (!transaction.subAccountId) {
    throw new Error("sub account id is required for token transfer");
  }
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
  _: TokenCreateATACommand,
  commandDescriptor: ValidCommandDescriptor
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
  commandDescriptor: ValidCommandDescriptor
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
