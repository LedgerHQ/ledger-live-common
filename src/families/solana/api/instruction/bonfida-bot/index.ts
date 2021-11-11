import { TransactionInstruction } from "@solana/web3.js";

/*
export {
  isBonfidaBotInstruction,
  parseBonfidaBotInstructionTitle,
} from "./types";
*/

export const parseBonfidaBotInstruction = (
  transactionIx: TransactionInstruction
) => {
  return undefined;
};

export const isBonfidaBotInstruction = (value: any) => false;

export const parseBonfidaBotInstructionTitle = (value: any) => "unknown";
