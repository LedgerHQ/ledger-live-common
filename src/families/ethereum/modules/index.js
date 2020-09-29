// @flow
import values from "lodash/values";
import type {
  CryptoCurrency,
  TokenAccount,
  Account,
  TransactionStatus,
  Operation,
} from "../../../types";
import type { Transaction } from "../types";

import * as compound from "./compound";
import * as erc20 from "./erc20";
import * as send from "./send";
import type { Modes as CompoundModes } from "./compound";
import type { Modes as ERC20Modes } from "./erc20";
import type { Modes as SendModes } from "./send";

const modules = { erc20, compound, send };
export type TransactionMode = CompoundModes | ERC20Modes | SendModes;

type BufferLike = Buffer | string | number;

export type ModeModule = {
  fillTransactionStatus: (Account, Transaction, TransactionStatus) => void,
  fillTransactionData: (Account, Transaction, TxData) => void,
  fillOptimisticOperation: (Account, Transaction, Operation) => void,
};

export const modes: { [_: TransactionMode]: ModeModule } = {};

function loadModes() {
  for (let k in modules) {
    const m = modules[k];
    if (m.modes) {
      for (let j in m.modes) {
        // $FlowFixMe
        modes[j] = m.modes[j];
      }
    }
  }
}

loadModes();

export async function preload(): Promise<Object> {
  const value = {};
  for (let k in modules) {
    const m = modules[k];
    if (m.preload) {
      value[k] = await m.preload();
    }
  }
  return value;
}

export function hydrate(value: Object) {
  for (let k in value) {
    if (k in modules) {
      const m = modules[k];
      if (m.hydrate) {
        m.hydrate(value[k]);
      }
    }
  }
}

export const prepareTokenAccounts = (
  currency: CryptoCurrency,
  subAccounts: TokenAccount[],
  address: string
): Promise<TokenAccount[]> =>
  values(modules)
    .map((m) => m.prepareTokenAccounts)
    .filter(Boolean)
    .reduce(
      (p, fn) => p.then((s) => fn(currency, s, address)),
      Promise.resolve(subAccounts)
    );

export const digestTokenAccounts = (
  currency: CryptoCurrency,
  subAccounts: TokenAccount[],
  address: string
): Promise<TokenAccount[]> =>
  values(modules)
    .map((m) => m.digestTokenAccounts)
    .filter(Boolean)
    .reduce(
      (p, fn) => p.then((s) => fn(currency, s, address)),
      Promise.resolve(subAccounts)
    );

// this type is from transactionjs-tx
interface TxData {
  /**
   * The transaction's gas limit.
   */
  gasLimit?: BufferLike;
  /**
   * The transaction's gas price.
   */
  gasPrice?: BufferLike;
  /**
   * The transaction's the address is sent to.
   */
  to?: BufferLike;
  /**
   * The transaction's nonce.
   */
  nonce?: BufferLike;
  /**
   * This will contain the data of the message or the init of a contract
   */
  data?: BufferLike;
  /**
   * EC recovery ID.
   */
  v?: BufferLike;
  /**
   * EC signature parameter.
   */
  r?: BufferLike;
  /**
   * EC signature parameter.
   */
  s?: BufferLike;
  /**
   * The amount of Ether sent.
   */
  value?: BufferLike;
}
