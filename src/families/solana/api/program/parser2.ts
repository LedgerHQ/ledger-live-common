import bs58 from "bs58";
import { create } from "superstruct";

import {
  AccountMeta,
  ParsedInstruction,
  ParsedTransaction,
  PartiallyDecodedInstruction,
  TransactionInstruction,
} from "@solana/web3.js";
import { parseSplTokenInstruction } from "./token/types";

function isProgram<T extends string>(
  ix: ParsedInstruction,
  program: T
): ix is typeof ix & { program: T } {
  return ix.program === program;
}

export const parse = (
  ix: ParsedInstruction | PartiallyDecodedInstruction,
  tx: ParsedTransaction
) => {
  if ("parsed" in ix) {
    if (isProgram(ix, "spl-token")) {
      return parseSplTokenInstruction(ix);
    }

    if (isProgram(ix, "bpf-loader")) {
    }
    switch (ix.program) {
      case "spl-token":
        return parseSplTokenInstruction(ix);
      case "bpf-loader":
        return parseBpfLoaderInstruction();
      case "bpf-upgradeable-loader":
        return parseBpfUpgradeableLoaderInstruction();
      case "system":
        return parseSystemInstruction();
      case "stake":
        return parseStakeInstruction();
      case "spl-memo":
        return parseMemoInstruction();
      case "spl-associated-token-account":
        return parseSplAssociatedTokenAccountInstruction();
      case "vote":
        return parseVoteInstruction();
      default:
        return undefined;
    }
  }

  const transactionIx = intoTransactionInstruction(tx, ix);

  if (isBonfidaBotInstruction(transactionIx)) {
    return parseBonfidaBotInstruction();
  } else if (isMangoInstruction(transactionIx)) {
    return <MangoDetailsCard key={key} {...props} />;
  } else if (isSerumInstruction(transactionIx)) {
    return <SerumDetailsCard key={key} {...props} />;
  } else if (isTokenSwapInstruction(transactionIx)) {
    return <TokenSwapDetailsCard key={key} {...props} />;
  } else if (isTokenLendingInstruction(transactionIx)) {
    return <TokenLendingDetailsCard key={key} {...props} />;
  } else if (isWormholeInstruction(transactionIx)) {
    return <WormholeDetailsCard key={key} {...props} />;
  } else {
    return <UnknownDetailsCard key={key} {...props} />;
  }
};

export function intoTransactionInstruction(
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
