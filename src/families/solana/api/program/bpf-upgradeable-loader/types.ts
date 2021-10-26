import { enums, nullable, number, type, string, Infer } from "superstruct";
import { PublicKeyFromString } from "../utils/pubkey";
import { FinalizeInfo } from "../bpf-loader/types";

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
  "finalize",
]);

export type UpgradeableBpfLoaderProgram = {
  kind: "bpf-upgradeable-loader";
  instruction:
    | {
        kind: "initializeBuffer";
        info: InitializeBufferInfo;
      }
    | {
        kind: "deployWithMaxDataLen";
        info: DeployWithMaxDataLenInfo;
      }
    | {
        kind: "setAuthority";
        info: SetAuthorityInfo;
      }
    | {
        kind: "write";
        info: WriteInfo;
      }
    | {
        kind: "finalize";
        info: FinalizeInfo;
      };
};
