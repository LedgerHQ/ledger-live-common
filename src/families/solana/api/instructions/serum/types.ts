import { MARKETS } from "@project-serum/serum";
import { TransactionInstruction } from "@solana/web3.js";

const SERUM_PROGRAM_IDS = [
  "4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn",
  "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
];

export function isSerumInstruction(instruction: TransactionInstruction) {
  return (
    SERUM_PROGRAM_IDS.includes(instruction.programId.toBase58()) ||
    MARKETS.some(
      (market) =>
        market.programId && market.programId.equals(instruction.programId)
    )
  );
}

const SERUM_CODE_LOOKUP: { [key: number]: string } = {
  0: "Initialize Market",
  1: "New Order",
  2: "Match Orders",
  3: "Consume Events",
  4: "Cancel Order",
  5: "Settle Funds",
  6: "Cancel Order By Client Id",
  7: "Disable Market",
  8: "Sweep Fees",
  9: "New Order",
  10: "New Order",
  11: "Cancel Order",
  12: "Cancel Order By Client Id",
  13: "Send Take",
  14: "Close Open Orders",
  15: "Init Open Orders",
};

function parseSerumInstructionCode(instruction: TransactionInstruction) {
  return instruction.data.slice(1, 5).readUInt32LE(0);
}

export function parseSerumInstructionTitle(
  instruction: TransactionInstruction
): string | undefined {
  const code = parseSerumInstructionCode(instruction);
  return SERUM_CODE_LOOKUP[code];
}
