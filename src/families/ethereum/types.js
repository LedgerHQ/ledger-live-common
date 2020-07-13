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
  OperationType,
  Spec,
} from "../../libcore/types";

export type EthereumGasLimitRequest = {
  from?: string,
  to?: string,
  value?: string,
  data?: string,
  gas?: string,
  gasPrice?: string,
  amplifier?: number,
};

declare class CoreEthereumLikeAddress {
  toEIP55(): Promise<string>;
}

declare class CoreEthereumLikeTransaction {
  getHash(): Promise<string>;
  getNonce(): Promise<number>;
  getGasPrice(): Promise<CoreAmount>;
  getGasLimit(): Promise<CoreAmount>;
  getGasUsed(): Promise<CoreAmount>;
  getReceiver(): Promise<CoreEthereumLikeAddress>;
  getSender(): Promise<CoreEthereumLikeAddress>;
  serialize(): Promise<string>;
  setSignature(string, string, string): Promise<void>;
  getStatus(): Promise<number>;
}

declare class CoreInternalTransaction {
  getGasLimit(): Promise<CoreBigInt>;
  getUsedGas(): Promise<CoreBigInt>;
  getSender(): Promise<string>;
  getReceiver(): Promise<string>;
  getValue(): Promise<CoreBigInt>;
  getOperationType(): Promise<OperationType>;
}

declare class CoreEthereumLikeOperation {
  static fromCoreOperation(
    coreOperation: CoreOperation
  ): ?CoreEthereumLikeOperation;
  getTransaction(): Promise<CoreEthereumLikeTransaction>;
  getInternalTransactions(): Promise<CoreInternalTransaction[]>;
}

declare class CoreEthereumLikeTransactionBuilder {
  wipeToAddress(address: string): Promise<void>;
  sendToAddress(amount: CoreAmount, recipient: string): Promise<void>;
  setGasPrice(gasPrice: CoreAmount): Promise<void>;
  setGasLimit(gasLimit: CoreAmount): Promise<void>;
  setInputData(data: string): Promise<void>;
  build(): Promise<CoreEthereumLikeTransaction>;
}

declare class CoreEthereumLikeAccount {
  static fromCoreAccount(coreAccount: CoreAccount): ?CoreEthereumLikeAccount;
  getERC20Accounts(): Promise<CoreERC20LikeAccount[]>;
  buildTransaction(): Promise<CoreEthereumLikeTransactionBuilder>;
  broadcastRawTransaction(signed: string): Promise<string>;
  getGasPrice(): Promise<CoreBigInt>;
  getEstimatedGasLimit(address: string): Promise<CoreBigInt>;
  getERC20Balances(erc20Addresses: string[]): Promise<CoreBigInt[]>;
}

declare class CoreERC20Token {
  getContractAddress(): Promise<string>;
}

declare class CoreERC20LikeAccount {
  getBalance(): Promise<CoreBigInt>;
  getAddress(): Promise<string>;
  getToken(): Promise<CoreERC20Token>;
  getOperations(): Promise<CoreERC20LikeOperation[]>;
}

declare class CoreERC20LikeOperation {
  getHash(): Promise<string>;
  getNonce(): Promise<CoreBigInt>;
  getGasPrice(): Promise<CoreBigInt>;
  getGasLimit(): Promise<CoreBigInt>;
  getUsedGas(): Promise<CoreBigInt>;
  getSender(): Promise<string>;
  getReceiver(): Promise<string>;
  getValue(): Promise<CoreBigInt>;
  getTime(): Promise<string>;
  getOperationType(): Promise<OperationType>;
  getStatus(): Promise<number>;
  getBlockHeight(): Promise<?number>;
}

export type CoreStatics = {
  InternalTransaction: Class<CoreInternalTransaction>,
  EthereumLikeOperation: Class<CoreEthereumLikeOperation>,
  EthereumLikeAddress: Class<CoreEthereumLikeAddress>,
  EthereumLikeTransaction: Class<CoreEthereumLikeTransaction>,
  EthereumLikeAccount: Class<CoreEthereumLikeAccount>,
  EthereumLikeTransactionBuilder: Class<CoreEthereumLikeTransactionBuilder>,
  EthereumLikeTransaction: Class<CoreEthereumLikeTransaction>,
  ERC20LikeAccount: Class<CoreERC20LikeAccount>,
  ERC20LikeOperation: Class<CoreERC20LikeOperation>,
  ERC20Token: Class<CoreERC20Token>,
};

export type {
  CoreEthereumLikeOperation,
  CoreInternalTransaction,
  CoreEthereumLikeAccount,
  CoreEthereumLikeTransaction,
  CoreEthereumLikeTransactionBuilder,
  CoreERC20LikeAccount,
  CoreERC20LikeOperation,
  CoreERC20Token,
};

export type CoreAccountSpecifics = {};

export type CoreOperationSpecifics = {};

export type CoreCurrencySpecifics = {};

export type NetworkInfo = {|
  family: "ethereum",
  gasPrice: BigNumber,
|};

export type NetworkInfoRaw = {|
  family: "ethereum",
  gasPrice: string,
|};

export type Transaction = {|
  ...TransactionCommon,
  family: "ethereum",
  gasPrice: ?BigNumber,
  userGasLimit: ?BigNumber,
  estimatedGasLimit: ?BigNumber,
  feeCustomUnit: ?Unit,
  networkInfo: ?NetworkInfo,
|};

export type TransactionRaw = {|
  ...TransactionCommonRaw,
  family: "ethereum",
  gasPrice: ?string,
  userGasLimit: ?string,
  estimatedGasLimit: ?string,
  feeCustomUnit: ?Unit,
  networkInfo: ?NetworkInfoRaw,
|};

export const reflect = (declare: (string, Spec) => void) => {
  declare("InternalTransaction", {
    methods: {
      getGasLimit: { returns: "BigInt" },
      getUsedGas: { returns: "BigInt" },
      getSender: {},
      getReceiver: {},
      getValue: { returns: "BigInt" },
      getOperationType: {},
    },
  });

  declare("EthereumLikeOperation", {
    methods: {
      getTransaction: {
        returns: "EthereumLikeTransaction",
      },
      getInternalTransactions: {
        returns: ["InternalTransaction"],
      },
    },
  });

  declare("EthereumLikeAddress", {
    methods: {
      toEIP55: {},
    },
  });

  declare("EthereumLikeTransaction", {
    methods: {
      getHash: {},
      getNonce: {},
      getGasPrice: { returns: "Amount" },
      getGasLimit: { returns: "Amount" },
      getGasUsed: { returns: "Amount" },
      getReceiver: { returns: "EthereumLikeAddress" },
      getSender: { returns: "EthereumLikeAddress" },
      serialize: { returns: "hex" },
      setSignature: {
        params: ["hex", "hex", "hex"],
      },
      getStatus: {},
    },
  });

  declare("EthereumLikeTransactionBuilder", {
    methods: {
      wipeToAddress: {},
      sendToAddress: {
        params: ["Amount"],
      },
      setGasPrice: {
        params: ["Amount"],
      },
      setGasLimit: {
        params: ["Amount"],
      },
      setInputData: {
        params: ["hex"],
      },
      build: {
        returns: "EthereumLikeTransaction",
      },
    },
  });

  declare("EthereumLikeAccount", {
    methods: {
      buildTransaction: {
        returns: "EthereumLikeTransactionBuilder",
      },
      broadcastRawTransaction: {
        params: ["hex"],
      },
      getERC20Accounts: {
        returns: ["ERC20LikeAccount"],
      },
      getGasPrice: {
        returns: "BigInt",
      },
      getEstimatedGasLimit: {
        returns: "BigInt",
      },
      getERC20Balances: {
        returns: ["BigInt"],
      },
    },
  });

  declare("ERC20LikeAccount", {
    methods: {
      getBalance: { returns: "BigInt" },
      getAddress: {},
      getToken: { returns: "ERC20Token" },
      getOperations: { returns: ["ERC20LikeOperation"] },
    },
  });

  declare("ERC20LikeOperation", {
    methods: {
      getHash: {},
      getNonce: { returns: "BigInt" },
      getGasPrice: { returns: "BigInt" },
      getGasLimit: { returns: "BigInt" },
      getUsedGas: { returns: "BigInt" },
      getSender: {},
      getReceiver: {},
      getValue: { returns: "BigInt" },
      getTime: {},
      getOperationType: {},
      getStatus: {},
      getBlockHeight: {},
    },
  });

  declare("ERC20Token", {
    njsUsesPlainObject: true,
    methods: {
      getContractAddress: {
        njsField: "contractAddress",
      },
    },
  });

  return {
    OperationMethods: {},
    AccountMethods: {}
  };
};
