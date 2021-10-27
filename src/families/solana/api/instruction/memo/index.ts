import { ParsedInstruction } from "@solana/web3.js";
import { IX_STRUCTS, IX_TITLES, MemoInstructionType } from "./types";
import { Infer } from "superstruct";

export function parseMemoInstruction(
  ix: ParsedInstruction & { program: "spl-memo" }
): MemoInstructionDescriptor {
  return {
    title: "Save",
    type: "save",
    info: {
      data: ix.parsed,
    },
  };
}

type MemoInstructionDescriptor = {
  [K in MemoInstructionType]: {
    title: typeof IX_TITLES[K];
    type: K;
    info: Infer<typeof IX_STRUCTS[K]>;
  };
}[MemoInstructionType];
