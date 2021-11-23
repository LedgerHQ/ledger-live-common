import {
  ParsedInstruction,
  PartiallyDecodedInstruction,
} from "@solana/web3.js";
import { parseSplTokenInstruction } from "../instruction/token";
import { PARSED_PROGRAMS } from "./constants";
import { parseAssociatedTokenAccountInstruction } from "../instruction/associated-token-account";
import { parseSplMemoInstruction } from "../instruction/memo";
import { parseStakeInstruction } from "../instruction/stake";

export const parse = (ix: ParsedInstruction | PartiallyDecodedInstruction) => {
  if ("parsed" in ix) {
    const program: typeof PARSED_PROGRAMS[keyof typeof PARSED_PROGRAMS] =
      ix.program as any;

    switch (program) {
      case "spl-associated-token-account":
        return {
          program,
          title: "Associated Token Account",
          instruction: parseAssociatedTokenAccountInstruction({
            ...ix,
            program,
          }),
        };
      case "spl-memo":
        return {
          program,
          title: "Memo",
          instruction: parseSplMemoInstruction({
            ...ix,
            program,
          }),
        };
      case "stake":
        return {
          program,
          title: "Stake",
          instruction: parseStakeInstruction({
            ...ix,
            program,
          }),
        };
      case "spl-token":
        return {
          program,
          title: "Token",
          instruction: parseSplTokenInstruction({
            ...ix,
            program,
          }),
        };
      default:
        return unknown();
    }
  }

  return unknown();
};

export const parseQuiet = (
  ix: ParsedInstruction | PartiallyDecodedInstruction
) => {
  try {
    return parse(ix);
  } catch (_) {
    return unknown();
  }
};

function unknown() {
  return {
    program: "Unknown",
    title: "Unknown",
    instruction: undefined,
  } as const;
}
