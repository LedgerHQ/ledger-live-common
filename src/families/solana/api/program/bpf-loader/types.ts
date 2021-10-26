/* eslint-disable @typescript-eslint/no-redeclare */

import { enums, number, type, string, Infer } from "superstruct";
import { PublicKeyFromString } from "../utils/pubkey";

export type WriteInfo = Infer<typeof WriteInfo>;
export const WriteInfo = type({
  account: PublicKeyFromString,
  bytes: string(),
  offset: number(),
});

export type FinalizeInfo = Infer<typeof FinalizeInfo>;
export const FinalizeInfo = type({
  account: PublicKeyFromString,
});

export type BpfLoaderInstructionType = Infer<typeof BpfLoaderInstructionType>;
export const BpfLoaderInstructionType = enums(["write", "finalize"]);

export type BpfLoaderProgram = {
  kind: "bpf-loader";
  instruction:
    | {
        kind: "write";
        info: WriteInfo;
      }
    | {
        kind: "finalize";
        info: FinalizeInfo;
      };
};
