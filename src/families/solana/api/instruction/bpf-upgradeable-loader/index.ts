import { ParsedInfo } from "../../validators";
import { create, Infer } from "superstruct";
import { ParsedInstruction } from "@solana/web3.js";
import {
  UpgradeableBpfLoaderInstructionType,
  IX_STRUCTS,
  IX_TITLES,
} from "./types";
import { PARSED_PROGRAMS } from "../../program/constants";

export function parseBpfUpgradeableLoaderInstruction(
  ix: ParsedInstruction & {
    program: typeof PARSED_PROGRAMS.BPF_UPGRADEABLE_LOADER;
  }
): BpfUpgradeableLoaderInstructionDescriptor {
  const parsed = create(ix.parsed, ParsedInfo);
  const { type: rawType, info } = parsed;
  const type = create(rawType, UpgradeableBpfLoaderInstructionType);
  const title = IX_TITLES[type];
  const struct = IX_STRUCTS[type];

  return {
    type,
    title: title as any,
    info: create(info, struct as any) as any,
  };
}

type BpfUpgradeableLoaderInstructionDescriptor = {
  [K in UpgradeableBpfLoaderInstructionType]: {
    title: typeof IX_TITLES[K];
    type: K;
    info: Infer<typeof IX_STRUCTS[K]>;
  };
}[UpgradeableBpfLoaderInstructionType];
