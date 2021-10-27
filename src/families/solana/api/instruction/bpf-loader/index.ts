import { ParsedInfo } from "../../validators";
import { create, Infer } from "superstruct";
import { ParsedInstruction } from "@solana/web3.js";
import { BpfLoaderInstructionType, IX_STRUCTS, IX_TITLES } from "./types";
import { PROGRAMS } from "../../constants";

export function parseBpfLoaderInstruction(
  ix: ParsedInstruction & { program: typeof PROGRAMS.BPF_LOADER }
): BpfLoaderInstructionDescriptor {
  const parsed = create(ix.parsed, ParsedInfo);
  const { type: rawType, info } = parsed;
  const type = create(rawType, BpfLoaderInstructionType);
  const title = IX_TITLES[type];
  const struct = IX_STRUCTS[type];

  return {
    type,
    title: title as any,
    info: create(info, struct as any) as any,
  };
}

type BpfLoaderInstructionDescriptor = {
  [K in BpfLoaderInstructionType]: {
    title: typeof IX_TITLES[K];
    type: K;
    info: Infer<typeof IX_STRUCTS[K]>;
  };
}[BpfLoaderInstructionType];
