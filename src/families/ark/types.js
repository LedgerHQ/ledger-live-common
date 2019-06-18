// @flow

import type { CoreAmount, Spec } from "../../libcore/types";

declare class CoreArkLikeAddress {
  toBase58(): Promise<string>;
}

declare class CoreArkLikeTransaction {
  getHash(): Promise<string>;
  getFees(): Promise<CoreAmount>;
  getReceiver(): Promise<CoreArkLikeAddress>;
  getSender(): Promise<CoreArkLikeAddress>;
  serialize(): Promise<string>;
  setSignature(string, string): Promise<void>;
  setDERSignature(string): Promise<void>;
}

declare class CoreArkLikeOperation {
  getTransaction(): Promise<CoreArkLikeTransaction>;
}

declare class CoreArkLikeTransactionBuilder {
  wipeToAddress(address: string): Promise<void>;
  sendToAddress(amount: CoreAmount, recipient: string): Promise<void>;
  setFees(fees: CoreAmount): Promise<void>;
  build(): Promise<CoreArkLikeTransaction>;
}

declare class CoreArkLikeAccount {
  buildTransaction(): Promise<CoreArkLikeTransactionBuilder>;
  broadcastRawTransaction(signed: string): Promise<string>;
}

export type CoreStatics = {
  ArkLikeOperation: Class<CoreArkLikeOperation>,
  ArkLikeAddress: Class<CoreArkLikeAddress>,
  ArkLikeTransaction: Class<CoreArkLikeTransaction>,
  ArkLikeAccount: Class<CoreArkLikeAccount>,
  ArkLikeTransactionBuilder: Class<CoreArkLikeTransactionBuilder>,
  ArkLikeTransaction: Class<CoreArkLikeTransaction>
};

export type {
  CoreArkLikeAccount,
  CoreArkLikeAddress,
  CoreArkLikeOperation,
  CoreArkLikeTransaction,
  CoreArkLikeTransactionBuilder
};

export type CoreAccountSpecifics = {
  asArkLikeAccount(): Promise<CoreArkLikeAccount>
};

export type CoreOperationSpecifics = {
  asArkLikeOperation(): Promise<CoreArkLikeOperation>
};

export type CoreCurrencySpecifics = {};

export const reflect = (declare: (string, Spec) => void) => {
  declare("ArkLikeAddress", {
    methods: {
      toBase58: {}
    }
  });

  declare("ArkLikeOperation", {
    methods: {
      getTransaction: {
        returns: "ArkLikeTransaction"
      }
    }
  });

  declare("ArkLikeTransaction", {
    methods: {
      getHash: {},
      getFees: { returns: "Amount" },
      getReceiver: { returns: "ArkLikeAddress" },
      getSender: { returns: "ArkLikeAddress" },
      serialize: { returns: "hex" },
      setSignature: {
        params: ["hex", "hex"]
      },
      setDERSignature: {
        params: ["hex"]
      }
    }
  });

  declare("ArkLikeTransactionBuilder", {
    methods: {
      wipeToAddress: {},
      sendToAddress: {
        params: ["Amount"]
      },
      setFees: {
        params: ["Amount"]
      },
      build: {
        returns: "ArkLikeTransaction"
      }
    }
  });

  declare("ArkLikeAccount", {
    methods: {
      buildTransaction: {
        returns: "ArkLikeTransactionBuilder"
      },
      broadcastRawTransaction: {
        params: ["hex"]
      }
    }
  });
};
