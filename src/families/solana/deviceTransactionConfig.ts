import type { AccountLike, Account } from "../../types";
import type {
  StakeCreateAccountCommand,
  StakeDelegateCommand,
  StakeSplitCommand,
  StakeUndelegateCommand,
  StakeWithdrawCommand,
  TokenCreateATACommand,
  TokenTransferCommand,
  Transaction,
  TransferCommand,
  CommandDescriptor,
} from "./types";
import type { DeviceTransactionField } from "../../transaction";
import { assertUnreachable } from "./utils";

// do not show fields like 'To', 'Recipient', etc., as per Ledger policy

function getDeviceTransactionConfig({
  transaction,
}: {
  account: AccountLike;
  parentAccount: Account | null | undefined;
  transaction: Transaction;
}): Array<DeviceTransactionField> {
  const { commandDescriptor } = transaction.model;
  if (commandDescriptor === undefined) {
    throw new Error("missing command descriptor");
  }
  if (Object.keys(commandDescriptor.errors).length > 0) {
    throw new Error("unexpected invalid command");
  }

  return fieldsForCommand(commandDescriptor);
}

export default getDeviceTransactionConfig;
function fieldsForCommand(
  commandDescriptor: CommandDescriptor
): DeviceTransactionField[] {
  const { command } = commandDescriptor;
  switch (command.kind) {
    case "transfer":
      return fieldsForTransfer(command);
    case "token.transfer":
      return fieldsForTokenTransfer(command);
    case "token.createATA":
      return fieldsForCreateATA(command);
    case "stake.createAccount":
      return fieldsForStakeCreateAccount(command);
    case "stake.delegate":
      return fieldsForStakeDelegate(command);
    case "stake.undelegate":
      return fieldsForStakeUndelegate(command);
    case "stake.withdraw":
      return fieldsForStakeWithdraw(command);
    case "stake.split":
      return fieldsForStakeSplit(command);
    default:
      return assertUnreachable(command);
  }
}

function fieldsForTransfer(
  _command: TransferCommand
): DeviceTransactionField[] {
  const fields: Array<DeviceTransactionField> = [];

  fields.push({
    type: "amount",
    label: "Transfer",
  });

  return fields;
}
function fieldsForTokenTransfer(
  command: TokenTransferCommand
): DeviceTransactionField[] {
  const fields: Array<DeviceTransactionField> = [];

  if (command.recipientDescriptor.shouldCreateAsAssociatedTokenAccount) {
    fields.push({
      type: "address",
      label: "Create token acct",
      address: command.recipientDescriptor.tokenAccAddress,
    });

    fields.push({
      type: "address",
      label: "From mint",
      address: command.mintAddress,
    });
    fields.push({
      type: "address",
      label: "Funded by",
      address: command.ownerAddress,
    });
  }

  fields.push({
    type: "amount",
    label: "Transfer tokens",
  });

  fields.push({
    type: "address",
    address: command.ownerAssociatedTokenAccountAddress,
    label: "From",
  });

  fields.push({
    type: "address",
    address: command.ownerAddress,
    label: "Owner",
  });

  fields.push({
    type: "address",
    address: command.ownerAddress,
    label: "Fee payer",
  });

  return fields;
}

function fieldsForCreateATA(
  command: TokenCreateATACommand
): DeviceTransactionField[] {
  const fields: Array<DeviceTransactionField> = [];

  fields.push({
    type: "address",
    label: "Create token acct",
    address: command.associatedTokenAccountAddress,
  });

  fields.push({
    type: "address",
    label: "From mint",
    address: command.mint,
  });

  fields.push({
    type: "address",
    label: "Owned by",
    address: command.owner,
  });

  fields.push({
    type: "address",
    label: "Funded by",
    address: command.owner,
  });

  fields.push({
    type: "address",
    label: "Fee payer",
    address: command.owner,
  });

  return fields;
}
function fieldsForStakeCreateAccount(
  command: StakeCreateAccountCommand
): DeviceTransactionField[] {
  const fields: Array<DeviceTransactionField> = [];

  if (command.delegate) {
    fields.push({
      type: "text",
      label: "Unrecognized format",
      value: "Unrecognized format",
    });
    return fields;
  }

  fields.push({
    type: "address",
    label: "Create stake acct",
    address: command.stakeAccAddress,
  });

  fields.push({
    type: "amount",
    label: "Deposit",
  });

  fields.push({
    type: "address",
    label: "From",
    address: command.fromAccAddress,
  });

  fields.push({
    type: "address",
    label: "Base",
    address: command.fromAccAddress,
  });

  fields.push({
    type: "text",
    label: "Seed",
    value: command.seed,
  });

  fields.push({
    type: "address",
    label: "New authority",
    address: command.fromAccAddress,
  });

  fields.push({
    type: "text",
    label: "Lockup",
    value: "None",
  });

  fields.push({
    type: "address",
    label: "Fee payer",
    address: command.fromAccAddress,
  });

  return fields;
}

function fieldsForStakeDelegate(
  command: StakeDelegateCommand
): DeviceTransactionField[] {
  const fields: Array<DeviceTransactionField> = [];

  fields.push({
    type: "address",
    label: "Delegate from",
    address: command.stakeAccAddr,
  });

  fields.push({
    type: "address",
    label: "Vote account",
    address: command.voteAccAddr,
  });

  return fields;
}

function fieldsForStakeUndelegate(
  command: StakeUndelegateCommand
): DeviceTransactionField[] {
  const fields: Array<DeviceTransactionField> = [];

  fields.push({
    type: "address",
    label: "Deactivate stake",
    address: command.stakeAccAddr,
  });

  return fields;
}

function fieldsForStakeWithdraw(
  command: StakeWithdrawCommand
): DeviceTransactionField[] {
  const fields: Array<DeviceTransactionField> = [];

  fields.push({
    type: "amount",
    label: "Stake withdraw",
  });

  fields.push({
    type: "address",
    label: "From",
    address: command.stakeAccAddr,
  });

  return fields;
}

function fieldsForStakeSplit(
  command: StakeSplitCommand
): DeviceTransactionField[] {
  const fields: Array<DeviceTransactionField> = [];

  fields.push({
    type: "amount",
    label: "Split stake",
  });

  fields.push({
    type: "address",
    label: "From",
    address: command.stakeAccAddr,
  });

  fields.push({
    type: "address",
    label: "To",
    address: command.splitStakeAccAddr,
  });

  fields.push({
    type: "address",
    label: "Base",
    address: command.authorizedAccAddr,
  });

  fields.push({
    type: "text",
    label: "Seed",
    value: command.seed,
  });

  fields.push({
    type: "address",
    label: "Authorized by",
    address: command.authorizedAccAddr,
  });

  fields.push({
    type: "address",
    label: "Fee payer",
    address: command.authorizedAccAddr,
  });

  return fields;
}
