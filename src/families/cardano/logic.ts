import {
  CARDANO_NETWORK_ID,
  STAKING_ADDRESS_INDEX,
  TTL_GAP,
} from "./constants";

import {
  utils as TyphonUtils,
  types as TyphonTypes,
  address as TyphonAddress,
} from "@stricahq/typhonjs";
import {
  AddressType,
  TxInput,
  TxOutput,
  TxOutputDestination,
  TxOutputDestinationType,
} from "@cardano-foundation/ledgerjs-hw-app-cardano";
import { str_to_path } from "@cardano-foundation/ledgerjs-hw-app-cardano/dist/utils";
import {
  BipPath,
  PaymentChain,
  PaymentCredential,
  StakeChain,
  StakeCredential,
} from "./types";
import { Bip32PublicKey } from "@stricahq/bip32ed25519";
import bs58 from "bs58";
import _ from "lodash";
import BigNumber from "bignumber.js";
import { getNetworkParameters } from "./networks";
import { OperationType } from "../../types";

/**
 *  returns BipPath object with account, chain and index field for cardano
 *
 * @param {string} path
 */
export function getBipPathFromString(path: string): BipPath {
  const regEx = new RegExp(/^1852'\/1815'\/(\d*)'\/([012])\/(\d*)/);
  const result = path.match(regEx);
  if (result == null) {
    throw new Error("Invalid derivation path");
  }
  return getBipPath({
    account: parseInt(result[1]),
    chain: parseInt(result[2]),
    index: parseInt(result[3]),
  });
}

/**
 * returns complete bipPath with purpose, coin, account, chain and index for cardano
 */
export function getBipPath({
  account,
  chain,
  index,
}: {
  account: number;
  chain: PaymentChain | StakeChain;
  index: number;
}): BipPath {
  return {
    purpose: 1852,
    coin: 1815,
    account,
    chain,
    index,
  };
}

/**
 * returns bipPathString from account, chain and index for cardano
 */
export function getBipPathString({
  account,
  chain,
  index,
}: {
  account: number;
  chain: number;
  index: number;
}): string {
  return `1852'/1815'/${account}'/${chain}/${index}`;
}

export function getExtendedPublicKeyFromHex(keyHex: string): Bip32PublicKey {
  return Bip32PublicKey.fromBytes(Buffer.from(keyHex, "hex"));
}

export function getCredentialKey(
  accountKey: Bip32PublicKey,
  path: BipPath
): { key: string; path: BipPath } {
  const keyBytes = accountKey
    .derive(path.chain)
    .derive(path.index)
    .toPublicKey()
    .hash();
  const pubKeyHex = keyBytes.toString("hex");
  return {
    key: pubKeyHex,
    path,
  };
}

/**
 * returns cardano base address by paymentKey and stakeKey
 */
export function getBaseAddress({
  paymentCred,
  stakeCred,
}: {
  paymentCred: PaymentCredential;
  stakeCred: StakeCredential;
}): TyphonAddress.BaseAddress {
  const networkId = CARDANO_NETWORK_ID;

  const paymentCredential: TyphonTypes.HashCredential = {
    hash: paymentCred.key,
    type: TyphonTypes.HashType.ADDRESS,
    bipPath: paymentCred.path,
  };

  const stakeCredential: TyphonTypes.HashCredential = {
    hash: stakeCred.key,
    type: TyphonTypes.HashType.ADDRESS,
    bipPath: stakeCred.path,
  };
  return new TyphonAddress.BaseAddress(
    networkId,
    paymentCredential,
    stakeCredential
  );
}

/**
 * Returns true if address is a valid
 *
 * @param {string} address
 */
export const isValidAddress = (address: string): boolean => {
  if (!address) return false;

  try {
    // check if it is byron address
    bs58.decode(address);
  } catch (error) {
    try {
      const hexAddress = TyphonUtils.decodeBech32(address);
      const networkId = Number(hexAddress.value.toLowerCase().charAt(1));
      if (CARDANO_NETWORK_ID !== networkId) {
        return false;
      }
    } catch (error) {
      return false;
    }
  }
  return true;
};

export const getAbsoluteSlot = function (
  networkName: string,
  time: Date
): number {
  const networkParams = getNetworkParameters(networkName);
  const byronChainEndSlots =
    networkParams.shelleyStartEpoch * networkParams.byronSlotsPerEpoch;
  const byronChainEndTime =
    byronChainEndSlots * networkParams.byronSlotDuration;

  const shelleyChainTime =
    time.getTime() - networkParams.chainStartTime - byronChainEndTime;
  const shelleyChainSlots = Math.floor(
    shelleyChainTime / networkParams.shelleySlotDuration
  );
  return byronChainEndSlots + shelleyChainSlots;
};

/**
 * Returns the time to live for transaction
 *
 * @returns {number}
 */
export function getTTL(networkName: string): number {
  return getAbsoluteSlot(networkName, new Date()) + TTL_GAP;
}

export function mergeTokens(
  tokens: Array<TyphonTypes.Token>
): Array<TyphonTypes.Token> {
  return _(tokens)
    .groupBy((t) => `${t.policyId}${t.assetName}`)
    .map((similarTokens) => ({
      policyId: similarTokens[0].policyId,
      assetName: similarTokens[0].assetName,
      amount: similarTokens.reduce(
        (total, token) => total.plus(token.amount),
        new BigNumber(0)
      ),
    }))
    .value();
}

/**
 * @param { Array<TyphonTypes.Token> } b
 * @param { Array<TyphonTypes.Token> } a
 * @returns a - b
 */
export function getTokenDiff(
  a: Array<TyphonTypes.Token>,
  b: Array<TyphonTypes.Token>
): Array<TyphonTypes.Token> {
  return mergeTokens(
    a.concat(b.map((t) => ({ ...t, amount: t.amount.negated() })))
  ).filter((t) => !t.amount.eq(0));
}

/**
 * returns the formatted transactionOutput for ledger cardano app
 *
 * @param output
 * @param accountIndex
 * @returns {TxOutput}
 */
export function prepareLedgerOutput(
  output: TyphonTypes.Output,
  accountIndex: number
): TxOutput {
  const isByronAddress = output.address instanceof TyphonAddress.ByronAddress;
  let isDeviceOwnedAddress = false;
  let destination: TxOutputDestination;

  if (!isByronAddress) {
    const address = output.address as TyphonTypes.ShelleyAddress;
    isDeviceOwnedAddress =
      address.paymentCredential &&
      address.paymentCredential.type === TyphonTypes.HashType.ADDRESS &&
      address.paymentCredential.bipPath !== undefined;
  }

  if (isDeviceOwnedAddress) {
    const address = output.address as TyphonAddress.BaseAddress;

    const paymentKeyPath = (
      address.paymentCredential as TyphonTypes.HashCredential
    ).bipPath as TyphonTypes.BipPath;
    const stakingKeyPath = (
      address.stakeCredential as TyphonTypes.HashCredential
    ).bipPath as TyphonTypes.BipPath;

    const paymentKeyPathString = getBipPathString({
      account: accountIndex,
      chain: paymentKeyPath.chain,
      index: paymentKeyPath.index,
    });
    const stakingKeyPathString = getBipPathString({
      account: accountIndex,
      chain: stakingKeyPath.chain,
      index: stakingKeyPath.index,
    });

    destination = {
      type: TxOutputDestinationType.DEVICE_OWNED,
      params: {
        type: AddressType.BASE_PAYMENT_KEY_STAKE_KEY,
        params: {
          spendingPath: str_to_path(paymentKeyPathString),
          stakingPath: str_to_path(stakingKeyPathString),
        },
      },
    };
  } else {
    const address = output.address;
    destination = {
      type: TxOutputDestinationType.THIRD_PARTY,
      params: {
        addressHex: address.getHex(),
      },
    };
  }

  return {
    amount: output.amount.toString(),
    destination,
    tokenBundle: [],
  };
}

/**
 * returns the formatted transactionInput for ledger cardano app
 *
 * @param {TyphonTypes.Input} input
 * @param {number} accountIndex
 * @returns {TxInput}
 */
export function prepareLedgerInput(
  input: TyphonTypes.Input,
  accountIndex: number
): TxInput {
  const paymentKeyPath =
    input.address.paymentCredential.type === TyphonTypes.HashType.ADDRESS
      ? input.address.paymentCredential.bipPath
      : undefined;
  return {
    txHashHex: input.txId,
    outputIndex: input.index,
    path: paymentKeyPath
      ? str_to_path(
          getBipPathString({
            account: accountIndex,
            chain: paymentKeyPath.chain,
            index: paymentKeyPath.index,
          })
        )
      : null,
  };
}

export function getAccountStakeCredential(
  xpub: string,
  index: number
): StakeCredential {
  const accountXPubKey = getExtendedPublicKeyFromHex(xpub);
  const keyPath = getCredentialKey(
    accountXPubKey,
    getBipPath({
      account: index,
      chain: StakeChain.stake,
      index: STAKING_ADDRESS_INDEX,
    })
  );
  return {
    key: keyPath.key,
    path: keyPath.path,
  };
}

export function getOperationType({
  accountChange,
  fees,
}: {
  accountChange: BigNumber;
  fees: BigNumber;
}): OperationType {
  return accountChange.isNegative()
    ? accountChange.eq(fees)
      ? "FEES"
      : "OUT"
    : accountChange.isPositive()
    ? "IN"
    : "NONE";
}
