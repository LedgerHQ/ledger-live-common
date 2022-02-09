import { findTokenById } from "@ledgerhq/cryptoassets";
import { PublicKey } from "@solana/web3.js";
import { TokenAccount } from "../../types/account";
import { StakeMeta } from "./api/chain/account/stake";
import { SolanaStake } from "./types";
import { assertUnreachable } from "./utils";

export type Awaited<T> = T extends PromiseLike<infer U> ? U : T;

export const MAX_MEMO_LENGTH = 500;

export const isValidBase58Address = (address: string): boolean => {
  try {
    return Boolean(new PublicKey(address));
  } catch (_) {
    return false;
  }
};

export const isEd25519Address = (address: string): boolean => {
  return PublicKey.isOnCurve(new PublicKey(address).toBytes());
};

export function encodeAccountIdWithTokenAccountAddress(
  accountId: string,
  address: string
): string {
  return `${accountId}+${address}`;
}

export function decodeAccountIdWithTokenAccountAddress(
  accountIdWithTokenAccountAddress: string
): { accountId: string; address: string } {
  const lastColonIndex = accountIdWithTokenAccountAddress.lastIndexOf("+");
  return {
    accountId: accountIdWithTokenAccountAddress.slice(0, lastColonIndex),
    address: accountIdWithTokenAccountAddress.slice(lastColonIndex + 1),
  };
}

export function toTokenId(mint: string): string {
  return `solana/spl/${mint}`;
}

export function toTokenMint(tokenId: string): string {
  return tokenId.split("/")[2];
}

export function toSubAccMint(subAcc: TokenAccount): string {
  return toTokenMint(subAcc.token.id);
}

export function tokenIsListedOnLedger(mint: string): boolean {
  return findTokenById(toTokenId(mint))?.type === "TokenCurrency";
}

export function stakeActions(
  activationState: SolanaStake["activation"]["state"]
): ("unstake" | "restake" | "undelegate" | "redelegate")[] {
  switch (activationState) {
    case "active":
      return ["unstake"];
    case "activating":
      return ["unstake"];
    case "deactivating":
      return ["restake"];
    case "inactive":
      return ["undelegate", "restake", "redelegate"];
    default:
      return assertUnreachable(activationState);
  }
}

export function withdrawableFromStake({
  stakeAccBalance,
  activation,
  rentExemptReserve,
}: {
  stakeAccBalance: number;
  activation: SolanaStake["activation"];
  rentExemptReserve: number;
}) {
  switch (activation.state) {
    case "active":
    case "activating":
      return (
        stakeAccBalance -
        rentExemptReserve -
        activation.active -
        activation.inactive
      );
    case "deactivating":
      return stakeAccBalance - rentExemptReserve - activation.active;
    case "inactive":
      return stakeAccBalance;
    default:
      return assertUnreachable(activation.state);
  }
}

export function isStakeLockUpInForce({
  lockup,
  custodianAddress,
  epoch,
}: {
  lockup: StakeMeta["lockup"];
  custodianAddress: string;
  epoch: number;
}) {
  if (custodianAddress === lockup.custodian.toBase58()) {
    return false;
  }
  return lockup.unixTimestamp > Date.now() / 1000 || lockup.epoch > epoch;
}
