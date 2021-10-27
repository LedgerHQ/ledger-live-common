import { TransactionInstruction } from "@solana/web3.js";

export {
  isBonfidaBotInstruction,
  parseBonfidaBotInstructionTitle,
} from "./types";

export const parseBonfidaBotInstruction = (
  transactionIx: TransactionInstruction
) => {};
