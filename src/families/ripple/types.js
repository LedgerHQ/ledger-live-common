// @flow

import type { BigNumber } from "bignumber.js";
import type { Unit } from "../../types";
import type {
  TransactionCommon,
  TransactionCommonRaw,
} from "../../types/transaction";
import type {
  CoreAccount,
  CoreAmount,
  CoreBigInt,
  CoreOperation,
  CoreServices,
  CoreWalletStore,
  Spec
} from "../../libcore/types";

declare class CoreRipple {
  registerInto(
    services: CoreServices,
    walletStore: CoreWalletStore
  ): Promise<void>;
}

declare class CoreRippleLikeAddress {
  toBase58(): Promise<string>;
}

declare class CoreRippleLikeTransaction {
  getHash(): Promise<string>;
  getFees(): Promise<CoreAmount>;
  getReceiver(): Promise<CoreRippleLikeAddress>;
  getSender(): Promise<CoreRippleLikeAddress>;
  serialize(): Promise<string>;
  setSignature(string, string): Promise<void>;
  setDERSignature(string): Promise<void>;
  getDestinationTag(): Promise<?number>;
  getSequence(): Promise<CoreBigInt>;
}

declare class CoreRippleLikeOperation {
  static fromCoreOperation(
    coreOperation: CoreOperation
  ): ?CoreRippleLikeOperation;
  getTransaction(): Promise<CoreRippleLikeTransaction>;
}

declare class CoreRippleLikeTransactionBuilder {
  wipeToAddress(address: string): Promise<void>;
  sendToAddress(amount: CoreAmount, recipient: string): Promise<void>;
  setDestinationTag(tag: number): Promise<void>;
  setFees(fees: CoreAmount): Promise<void>;
  build(): Promise<CoreRippleLikeTransaction>;
}

declare class CoreRippleLikeAccount {
  static fromCoreAccount(coreAccount: CoreAccount): ?CoreRippleLikeAccount;
  buildTransaction(): Promise<CoreRippleLikeTransactionBuilder>;
  broadcastRawTransaction(signed: string): Promise<string>;
  getFees(): Promise<CoreAmount>;
  getBaseReserve(): Promise<CoreAmount>;
  isAddressActivated(address: string): Promise<boolean>;
}

export type CoreStatics = {
  Ripple: Class<CoreRipple>,
  RippleLikeOperation: Class<CoreRippleLikeOperation>,
  RippleLikeAddress: Class<CoreRippleLikeAddress>,
  RippleLikeTransaction: Class<CoreRippleLikeTransaction>,
  RippleLikeAccount: Class<CoreRippleLikeAccount>,
  RippleLikeTransactionBuilder: Class<CoreRippleLikeTransactionBuilder>,
  RippleLikeTransaction: Class<CoreRippleLikeTransaction>,
};

export type {
  CoreRippleLikeAccount,
  CoreRippleLikeAddress,
  CoreRippleLikeOperation,
  CoreRippleLikeTransaction,
  CoreRippleLikeTransactionBuilder,
};

export type CoreAccountSpecifics = {};

export type CoreOperationSpecifics = {};

export type CoreCurrencySpecifics = {};

export type NetworkInfo = {|
  family: "ripple",
  serverFee: BigNumber,
  baseReserve: BigNumber,
|};

export type NetworkInfoRaw = {|
  family: "ripple",
  serverFee: string,
  baseReserve: string,
|};

export type Transaction = {|
  ...TransactionCommon,
  family: "ripple",
  fee: ?BigNumber,
  networkInfo: ?NetworkInfo,
  tag: ?number,
  feeCustomUnit: ?Unit,
|};

export type TransactionRaw = {|
  ...TransactionCommonRaw,
  family: "ripple",
  fee: ?string,
  networkInfo: ?NetworkInfoRaw,
  tag: ?number,
  feeCustomUnit: ?Unit,
|};

export const reflect = (declare: (string, Spec) => void) => {
  declare("Ripple", {
    methods: {
      registerInto: {}
    }
  });

  declare("RippleLikeAddress", {
    methods: {
      toBase58: {},
    },
  });

  declare("RippleLikeOperation", {
    methods: {
      getTransaction: {
        returns: "RippleLikeTransaction",
      },
    },
  });

  declare("RippleLikeTransaction", {
    methods: {
      getHash: {},
      getDestinationTag: {},
      getSequence: { returns: "BigInt" },
      getFees: { returns: "Amount" },
      getReceiver: { returns: "RippleLikeAddress" },
      getSender: { returns: "RippleLikeAddress" },
      serialize: { returns: "hex" },
      setSignature: {
        params: ["hex", "hex"],
      },
      setDERSignature: {
        params: ["hex"],
      },
    },
  });

  declare("RippleLikeTransactionBuilder", {
    methods: {
      wipeToAddress: {},
      sendToAddress: {
        params: ["Amount"],
      },
      setFees: {
        params: ["Amount"],
      },
      setDestinationTag: {},
      build: {
        returns: "RippleLikeTransaction",
      },
    },
  });

  declare("RippleLikeAccount", {
    methods: {
      buildTransaction: {
        returns: "RippleLikeTransactionBuilder",
      },
      broadcastRawTransaction: {
        params: ["hex"],
      },
      getFees: {
        returns: "Amount",
      },
      getBaseReserve: {
        returns: "Amount",
      },
      isAddressActivated: {},
    },
  });

  return {
    OperationMethods: {},
    AccountMethods: {}
  };
};
