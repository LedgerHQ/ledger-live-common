import bs58 from "bs58";
import {
  PartiallyDecodedInstruction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  isBonfidaBotInstruction,
  parseBonfidaBotInstructionTitle,
} from "./bonfida-bot/types";
import { isMangoInstruction, parseMangoInstructionTitle } from "./mango/types";
import { isSerumInstruction, parseSerumInstructionTitle } from "./serum/types";
import {
  isTokenLendingInstruction,
  parseTokenLendingInstructionTitle,
} from "./token-lending/types";
import {
  isTokenSwapInstruction,
  parseTokenSwapInstructionTitle,
} from "./token-swap/types";
import {
  isWormholeInstruction,
  parseWormholeInstructionTitle,
} from "./wormhole/types";

function intoTransactionInstructionLike(
  instruction: PartiallyDecodedInstruction
): TransactionInstruction {
  return new TransactionInstruction({
    data: bs58.decode(instruction.data),
    keys: [],
    programId: instruction.programId,
  });
}

type ParserDescriptor = {
  canParse: (ix: TransactionInstruction) => boolean;
  titleParser: (ix: TransactionInstruction) => string | undefined;
  programName: string;
};

export const parseIxNames = (
  pdIx: PartiallyDecodedInstruction
): [string?, string?] => {
  const ix = intoTransactionInstructionLike(pdIx);

  const parserDescs: ParserDescriptor[] = [
    {
      canParse: isBonfidaBotInstruction,
      titleParser: parseBonfidaBotInstructionTitle,
      programName: "Bonfida Bot",
    },
    {
      canParse: isMangoInstruction,
      titleParser: parseMangoInstructionTitle,
      programName: "Mango",
    },
    {
      canParse: isSerumInstruction,
      titleParser: parseSerumInstructionTitle,
      programName: "Serum",
    },
    {
      canParse: isTokenLendingInstruction,
      titleParser: parseTokenLendingInstructionTitle,
      programName: "Token Lending",
    },
    {
      canParse: isTokenSwapInstruction,
      titleParser: parseTokenSwapInstructionTitle,
      programName: "Token Swap",
    },
    {
      canParse: isWormholeInstruction,
      titleParser: parseWormholeInstructionTitle,
      programName: "Wormhole",
    },
  ];

  const parserDesc = parserDescs.find((p) => p.canParse(ix));

  return parserDesc
    ? [parserDesc.programName, parserDesc.titleParser(ix)]
    : [undefined, undefined];
};
