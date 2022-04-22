import { Account } from "../../types";
import { ChainAPI } from "./api";
import { buildTransactionWithAPI } from "./js-buildTransaction";
import createTransaction from "./js-createTransaction";
import { Transaction, TransactionModel } from "./types";
import { assertUnreachable } from "./utils";

export async function estimateTxFee(
  api: ChainAPI,
  account: Account,
  kind: TransactionModel["kind"]
) {
  const tx = createDummyTx(account, kind);
  const [onChainTx] = await buildTransactionWithAPI(account, tx, api);
  return api.getFeeForMessage(onChainTx.compileMessage());
}

const createDummyTx = (account: Account, kind: TransactionModel["kind"]) => {
  switch (kind) {
    case "transfer":
      return createDummyTransferTx(account);
    case "stake.createAccount":
      return createDummyStakeCreateAccountTx(account);
    case "stake.delegate":
      return createDummyStakeDelegateTx(account);
    case "stake.undelegate":
      return createDummyStakeUndelegateTx(account);
    case "stake.withdraw":
      return createDummyStakeWithdrawTx(account);
    case "stake.split":
    case "token.createATA":
    case "token.transfer":
      throw new Error(`not implemented for <${kind}>`);
    default:
      return assertUnreachable(kind);
  }
};

const createDummyTransferTx = (account: Account): Transaction => {
  return {
    ...createTransaction({} as any),
    model: {
      kind: "transfer",
      uiState: {},
      commandDescriptor: {
        command: {
          kind: "transfer",
          amount: 0,
          recipient: account.freshAddress,
          sender: account.freshAddress,
        },
        ...commandDescriptorCommons,
      },
    },
  };
};

const createDummyStakeCreateAccountTx = (account: Account): Transaction => {
  return {
    ...createTransaction({} as any),
    model: {
      kind: "stake.createAccount",
      uiState: {} as any,
      commandDescriptor: {
        command: {
          kind: "stake.createAccount",
          amount: 0,
          delegate: {
            voteAccAddress: randomAddresses[0],
          },
          fromAccAddress: account.freshAddress,
          seed: "",
          stakeAccAddress: randomAddresses[1],
          stakeAccRentExemptAmount: 0,
        },
        ...commandDescriptorCommons,
      },
    },
  };
};

const createDummyStakeDelegateTx = (account: Account): Transaction => {
  return {
    ...createTransaction({} as any),
    model: {
      kind: "stake.delegate",
      uiState: {} as any,
      commandDescriptor: {
        command: {
          kind: "stake.delegate",
          authorizedAccAddr: account.freshAddress,
          stakeAccAddr: randomAddresses[0],
          voteAccAddr: randomAddresses[1],
        },
        ...commandDescriptorCommons,
      },
    },
  };
};

const createDummyStakeUndelegateTx = (account: Account): Transaction => {
  return {
    ...createTransaction({} as any),
    model: {
      kind: "stake.undelegate",
      uiState: {} as any,
      commandDescriptor: {
        command: {
          kind: "stake.undelegate",
          authorizedAccAddr: account.freshAddress,
          stakeAccAddr: randomAddresses[0],
        },
        ...commandDescriptorCommons,
      },
    },
  };
};

const createDummyStakeWithdrawTx = (account: Account): Transaction => {
  return {
    ...createTransaction({} as any),
    model: {
      kind: "stake.withdraw",
      uiState: {} as any,
      commandDescriptor: {
        command: {
          kind: "stake.withdraw",
          amount: 0,
          authorizedAccAddr: account.freshAddress,
          stakeAccAddr: randomAddresses[0],
          toAccAddr: randomAddresses[1],
        },
        ...commandDescriptorCommons,
      },
    },
  };
};

const commandDescriptorCommons = {
  errors: {},
  fee: 0,
  warnings: {},
};

// pregenerate for better caching
const randomAddresses = [
  "HxCvgjSbF8HMt3fj8P3j49jmajNCMwKAqBu79HUDPtkM",
  "AjmMiagw33Ad4WdPR3y2QWsDXaLxmsiSZEpMfpT1Q9uZ",
  "AVHhsobqNw3b3XD43fz7Crq3d3UxFYZfHAByh7ogZoeN",
  "FvbvvXMY4Rf1AtGG7UHJUesjt8FFgPnPy6o83Dna9mXK",
  "AEtRo9MKfLqGtjvxdz8H93R7SQxXLEkibVSJbs9XKnD1",
];
