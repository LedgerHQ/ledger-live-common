// @flow

import type { BigNumber } from "bignumber.js";
import type {
  CoreAccount,
  CoreAmount,
  CoreBigInt,
  CoreOperation,
  CoreServices,
  CoreWalletStore,
  OperationType,
  Spec,
  CoreOperationQuery,
} from "../../libcore/types";

declare class CoreTezos {
  registerInto(
    services: CoreServices,
    walletStore: CoreWalletStore
  ): Promise<void>;
  fromCoreAccount(coreAccount: CoreAccount): Promise<?CoreTezosLikeAccount>;
  fromCoreOperation(
    coreOperation: CoreOperation
  ): Promise<?CoreTezosLikeOperation>;
}

import type {
  TransactionCommon,
  TransactionCommonRaw,
} from "../../types/transaction";

export const tezosOperationTag = {
  OPERATION_TAG_NONE: 0,
  OPERATION_TAG_NONE1: 1,
  OPERATION_TAG_NONE2: 2,
  OPERATION_TAG_GENERIC: 3,
  OPERATION_TAG_NONE4: 4,
  OPERATION_TAG_PROPOSAL: 5,
  OPERATION_TAG_BALLOT: 6,
  OPERATION_TAG_REVEAL: 7,
  OPERATION_TAG_TRANSACTION: 8,
  OPERATION_TAG_ORIGINATION: 9,
  OPERATION_TAG_DELEGATION: 10,
};

export type TezosOperationMode = "send" | "delegate" | "undelegate";

export type TezosOperationTag = $Values<typeof tezosOperationTag>;

declare class CoreTezosLikeAddress {
  toBase58(): Promise<string>;
}

declare class CoreTezosLikeTransaction {
  getType(): Promise<TezosOperationTag>;
  getHash(): Promise<string>;
  getFees(): Promise<CoreAmount>;
  getValue(): Promise<CoreAmount>;
  getReceiver(): Promise<CoreTezosLikeAddress>;
  getSender(): Promise<CoreTezosLikeAddress>;
  getGasLimit(): Promise<CoreAmount>;
  serialize(): Promise<string>;
  setSignature(string): Promise<void>;
  getStatus(): Promise<number>;
}

declare class CoreTezosLikeOperation {
  getTransaction(): Promise<CoreTezosLikeTransaction>;
}

declare class CoreTezosLikeTransactionBuilder {
  setType(type: TezosOperationTag): Promise<CoreTezosLikeTransactionBuilder>;
  sendToAddress(
    amount: CoreAmount,
    address: string
  ): Promise<CoreTezosLikeTransactionBuilder>;
  wipeToAddress(address: string): Promise<CoreTezosLikeTransactionBuilder>;
  setFees(fees: CoreAmount): Promise<CoreTezosLikeTransactionBuilder>;
  setGasLimit(gasLimit: CoreAmount): Promise<CoreTezosLikeTransactionBuilder>;
  build(): Promise<CoreTezosLikeTransaction>;
  setStorageLimit(
    storageLimit: CoreBigInt
  ): Promise<CoreTezosLikeTransactionBuilder>;
}

declare class CoreTezosLikeAccount {
  broadcastRawTransaction(signed: string): Promise<string>;
  buildTransaction(): Promise<CoreTezosLikeTransactionBuilder>;
  getStorage(address: string): Promise<CoreBigInt>;
  getEstimatedGasLimit(address: string): Promise<CoreBigInt>;
  getFees(): Promise<CoreBigInt>;
  getOriginatedAccounts(): Promise<CoreTezosLikeOriginatedAccount[]>;
}

declare class CoreTezosLikeOriginatedAccount {
  getAddress(): Promise<string>;
  getPublicKey(): Promise<string>;
  getBalance(): Promise<CoreAmount>;
  isSpendable(): Promise<boolean>;
  isDelegatable(): Promise<boolean>;
  buildTransaction(): Promise<CoreTezosLikeTransactionBuilder>;
  queryOperations(): Promise<CoreOperationQuery>;
}

export type CoreStatics = {
  Tezos: Class<CoreTezos>,
  TezosLikeOperation: Class<CoreTezosLikeOperation>,
  TezosLikeAddress: Class<CoreTezosLikeAddress>,
  TezosLikeAccount: Class<CoreTezosLikeAccount>,
  TezosLikeTransaction: Class<CoreTezosLikeTransaction>,
  TezosLikeTransactionBuilder: Class<CoreTezosLikeTransactionBuilder>,
};

export type {
  CoreTezosLikeOperation,
  CoreTezosLikeAddress,
  CoreTezosLikeAccount,
  CoreTezosLikeOriginatedAccount,
  CoreTezosLikeTransaction,
  CoreTezosLikeTransactionBuilder,
};

export type CoreAccountSpecifics = {};

export type CoreOperationSpecifics = {};

export type CoreCurrencySpecifics = {};

export type NetworkInfo = {|
  family: "tezos",
  fees: BigNumber,
|};

export type NetworkInfoRaw = {|
  family: "tezos",
  fees: string,
|};

// TODO add a field for indicating if staking
export type Transaction = {|
  ...TransactionCommon,
  family: "tezos",
  mode: TezosOperationMode,
  networkInfo: ?NetworkInfo,
  fees: ?BigNumber,
  gasLimit: ?BigNumber,
  storageLimit: ?BigNumber,
|};

export type TransactionRaw = {|
  ...TransactionCommonRaw,
  family: "tezos",
  mode: TezosOperationMode,
  networkInfo: ?NetworkInfoRaw,
  fees: ?string,
  gasLimit: ?string,
  storageLimit: ?string,
|};

export const reflect = (declare: (string, Spec) => void) => {
  declare("Tezos", {
    methods: {
      registerInto: {},
      fromCoreAccount: {},
      fromCoreOperation: {}
    }
  });

  declare("TezosLikeAddress", {
    methods: {
      toBase58: {},
    },
  });

  declare("TezosLikeTransaction", {
    methods: {
      getType: {},
      getHash: {},
      getStatus: {},
      getFees: { returns: "Amount" },
      getValue: { returns: "Amount" },
      getGasLimit: { returns: "Amount" },
      getReceiver: { returns: "TezosLikeAddress" },
      getSender: { returns: "TezosLikeAddress" },
      serialize: { returns: "hex" },
      setSignature: {
        params: ["hex"],
      },
    },
  });

  declare("TezosLikeOperation", {
    methods: {
      getTransaction: {
        returns: "TezosLikeTransaction",
      },
    },
  });

  declare("TezosLikeTransactionBuilder", {
    methods: {
      setType: {
        returns: "TezosLikeTransactionBuilder",
      },
      sendToAddress: {
        params: ["Amount"],
        returns: "TezosLikeTransactionBuilder",
      },
      wipeToAddress: {
        returns: "TezosLikeTransactionBuilder",
      },
      setFees: {
        params: ["Amount"],
        returns: "TezosLikeTransactionBuilder",
      },
      setGasLimit: {
        params: ["Amount"],
        returns: "TezosLikeTransactionBuilder",
      },
      setStorageLimit: {
        params: ["BigInt"],
        returns: "TezosLikeTransactionBuilder",
      },
      build: {
        returns: "TezosLikeTransaction",
      },
    },
  });

  declare("TezosLikeAccount", {
    methods: {
      broadcastRawTransaction: {
        params: ["hex"],
      },
      buildTransaction: {
        returns: "TezosLikeTransactionBuilder",
      },
      getStorage: {
        returns: "BigInt",
      },
      getEstimatedGasLimit: {
        returns: "BigInt",
      },
      getFees: {
        returns: "BigInt",
      },
      getOriginatedAccounts: {
        returns: ["TezosLikeOriginatedAccount"],
      },
    },
  });

  declare("TezosLikeOriginatedAccount", {
    methods: {
      getAddress: {},
      getPublicKey: {},
      getBalance: {
        returns: "Amount",
      },
      isSpendable: {},
      isDelegatable: {},
      buildTransaction: {
        returns: "TezosLikeTransactionBuilder",
      },
      queryOperations: {
        returns: "OperationQuery",
      },
    },
  });

  return {
    OperationMethods: {},
    AccountMethods: {}
  };
};
