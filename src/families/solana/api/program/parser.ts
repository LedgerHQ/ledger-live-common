import bs58 from "bs58";

import {
  AccountMeta,
  ParsedInstruction,
  ParsedTransaction,
  PartiallyDecodedInstruction,
  TransactionInstruction,
} from "@solana/web3.js";
import { parseSplTokenInstruction } from "../instruction/token";
import { NON_PARSED_PROGRAMS, PARSED_PROGRAMS } from "./constants";
import { parseAssociatedTokenAccountInstruction } from "../instruction/associated-token-account";
import { parseBpfLoaderInstruction } from "../instruction/bpf-loader";
import { parseBpfUpgradeableLoaderInstruction } from "../instruction/bpf-upgradeable-loader";
import { parseSplMemoInstruction } from "../instruction/memo";
import { parseStakeInstruction } from "../instruction/stake";
import { parseSystemInstruction } from "../instruction/system";
import { parseVoteInstruction } from "../instruction/vote";
import {
  isBonfidaBotInstruction,
  parseBonfidaBotInstruction,
} from "../instruction/bonfida-bot";
import {
  isMangoInstruction,
  parseMangoInstruction,
} from "../instruction/mango";
import {
  isSerumInstruction,
  parseSerumInstruction,
} from "../instruction/serum";
import {
  isTokenSwapInstruction,
  parseTokenSwapInstruction,
} from "../instruction/token-swap";
import {
  isTokenLendingInstruction,
  parseTokenLendingInstruction,
} from "../instruction/token-lending";
import {
  isWormholeInstruction,
  parseWormholeInstruction,
} from "../instruction/wormhole";

export const parse = (
  ix: ParsedInstruction | PartiallyDecodedInstruction,
  tx: ParsedTransaction
) => {
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
      case "bpf-loader":
        return {
          program,
          title: "BPF Loader 2",
          instruction: parseBpfLoaderInstruction({
            ...ix,
            program,
          }),
        };
      case "bpf-upgradeable-loader":
        return {
          program,
          title: "BPF Upgradeable Loader",
          instruction: parseBpfUpgradeableLoaderInstruction({
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
      case "system":
        return {
          program,
          title: "System",
          instruction: parseSystemInstruction({
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
      case "vote":
        return {
          program,
          title: "Vote",
          instruction: parseVoteInstruction({
            ...ix,
            program,
          }),
        };
      default:
        const _: never = program;
        return unknown();
    }
  }

  const transactionIx = intoTransactionInstruction(tx, ix);

  if (!transactionIx) {
    return unknown();
  }

  if (isBonfidaBotInstruction(transactionIx)) {
    return {
      program: NON_PARSED_PROGRAMS.BONFIDA_BOT,
      title: "Bonfida Bot",
      instruction: parseBonfidaBotInstruction(transactionIx),
    };
  }

  if (isMangoInstruction(transactionIx)) {
    return {
      program: NON_PARSED_PROGRAMS.MANGO,
      title: "Mango",
      instruction: parseMangoInstruction(transactionIx),
    };
  }
  if (isSerumInstruction(transactionIx)) {
    return {
      program: NON_PARSED_PROGRAMS.SERUM,
      title: "Serum",
      instruction: parseSerumInstruction(transactionIx),
    };
  }
  if (isTokenSwapInstruction(transactionIx)) {
    return {
      program: NON_PARSED_PROGRAMS.TOKEN_SWAP,
      title: "Token Swap",
      instruction: parseTokenSwapInstruction(transactionIx),
    };
  }
  if (isTokenLendingInstruction(transactionIx)) {
    return {
      program: NON_PARSED_PROGRAMS.TOKEN_LENDING,
      title: "Token Lending",
      instruction: parseTokenLendingInstruction(transactionIx),
    };
  }
  if (isWormholeInstruction(transactionIx)) {
    return {
      program: NON_PARSED_PROGRAMS.WORMHOLE,
      title: "Wormhole",
      instruction: parseWormholeInstruction(transactionIx),
    };
  }

  return unknown();
};

function intoTransactionInstruction(
  tx: ParsedTransaction,
  instruction: PartiallyDecodedInstruction
): TransactionInstruction | undefined {
  const message = tx.message;
  const keys: AccountMeta[] = [];
  for (const account of instruction.accounts) {
    const accountKey = message.accountKeys.find(({ pubkey }) =>
      pubkey.equals(account)
    );
    if (!accountKey) return;
    keys.push({
      pubkey: accountKey.pubkey,
      isSigner: accountKey.signer,
      isWritable: accountKey.writable,
    });
  }

  return new TransactionInstruction({
    data: bs58.decode(instruction.data),
    keys: keys,
    programId: instruction.programId,
  });
}

export const parseQuiet = (
  ix: ParsedInstruction | PartiallyDecodedInstruction,
  tx: ParsedTransaction
) => {
  try {
    return parse(ix, tx);
  } catch (_) {
    // TODO: log it ?
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
