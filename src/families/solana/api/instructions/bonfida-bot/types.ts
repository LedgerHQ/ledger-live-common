import { TransactionInstruction } from "@solana/web3.js";

const BONFIDA_PROGRAM_ID = "63xyXHpA6EVF69kRmEbXAr8aBEkhgpaNUSRoTQyi5Rwr";

export const isBonfidaBotInstruction = (
  instruction: TransactionInstruction
) => {
  return instruction.programId.toBase58() === BONFIDA_PROGRAM_ID;
};

const INSTRUCTION_LOOKUP: { [key: number]: string } = {
  0: "Initialize Bot",
  1: "Create Bot",
  2: "Deposit",
  3: "Create Order",
  4: "Cancel Order",
  5: "Settle Funds",
  6: "Redeem",
  7: "Collect Fees",
};

export const parseBonfidaBotInstructionTitle = (
  instruction: TransactionInstruction
): string | undefined => {
  const code = instruction.data[0];

  return INSTRUCTION_LOOKUP[code];
};
