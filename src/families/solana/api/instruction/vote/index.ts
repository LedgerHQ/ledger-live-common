import { ParsedInstruction } from "@solana/web3.js";
import { IX_STRUCTS, IX_TITLES, VoteInstructionType } from "./types";

import { ParsedInfo } from "../../validators";
import { create, Infer } from "superstruct";
import { PROGRAMS } from "../../constants";

export function parseVoteInstruction(
  ix: ParsedInstruction & { program: typeof PROGRAMS.VOTE }
): VoteInstructionDescriptor {
  const parsed = create(ix.parsed, ParsedInfo);
  const { type: rawType, info } = parsed;
  const type = create(rawType, VoteInstructionType);
  const title = IX_TITLES[type];
  const struct = IX_STRUCTS[type];

  return {
    type,
    title: title as any,
    info: create(info, struct as any) as any,
  };
}

type VoteInstructionDescriptor = {
  [K in VoteInstructionType]: {
    title: typeof IX_TITLES[K];
    type: K;
    info: Infer<typeof IX_STRUCTS[K]>;
  };
}[VoteInstructionType];
