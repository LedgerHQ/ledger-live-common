/* eslint-disable @typescript-eslint/no-redeclare */

import { enums, nullable, number, type, string, Infer } from "superstruct";
import { PublicKeyFromString } from "../../validators/pubkey";

export type WriteInfo = Infer<typeof WriteInfo>;
export const WriteInfo = type({
  account: PublicKeyFromString,
  authority: PublicKeyFromString,
  bytes: string(),
  offset: number(),
});

export type InitializeBufferInfo = Infer<typeof InitializeBufferInfo>;
export const InitializeBufferInfo = type({
  account: PublicKeyFromString,
  authority: PublicKeyFromString,
});

export type UpgradeInfo = Infer<typeof UpgradeInfo>;
export const UpgradeInfo = type({
  programDataAccount: PublicKeyFromString,
  programAccount: PublicKeyFromString,
  bufferAccount: PublicKeyFromString,
  spillAccount: PublicKeyFromString,
  authority: PublicKeyFromString,
  rentSysvar: PublicKeyFromString,
  clockSysvar: PublicKeyFromString,
});

export type SetAuthorityInfo = Infer<typeof SetAuthorityInfo>;
export const SetAuthorityInfo = type({
  account: PublicKeyFromString,
  authority: PublicKeyFromString,
  newAuthority: nullable(PublicKeyFromString),
});

export type DeployWithMaxDataLenInfo = Infer<typeof DeployWithMaxDataLenInfo>;
export const DeployWithMaxDataLenInfo = type({
  programDataAccount: PublicKeyFromString,
  programAccount: PublicKeyFromString,
  payerAccount: PublicKeyFromString,
  bufferAccount: PublicKeyFromString,
  authority: PublicKeyFromString,
  rentSysvar: PublicKeyFromString,
  clockSysvar: PublicKeyFromString,
  systemProgram: PublicKeyFromString,
  maxDataLen: number(),
});

export type UpgradeableBpfLoaderInstructionType = Infer<
  typeof UpgradeableBpfLoaderInstructionType
>;
export const UpgradeableBpfLoaderInstructionType = enums([
  "initializeBuffer",
  "deployWithMaxDataLen",
  "setAuthority",
  "write",
  // TODO: check out why missing
  //"finalize",
]);

export const IX_STRUCTS = {
  initializeBuffer: InitializeBufferInfo,
  deployWithMaxDataLen: DeployWithMaxDataLenInfo,
  setAuthority: SetAuthorityInfo,
  write: WriteInfo,
} as const;

export const IX_TITLES = {
  initializeBuffer: "Initialize Buffer",
  deployWithMaxDataLen: "Deploy With Max Data Len",
  setAuthority: "Set Authority",
  write: "Write",
} as const;
