import bs58 from "bs58";

import {
  AccountMeta,
  ParsedInstruction,
  ParsedTransaction,
  PartiallyDecodedInstruction,
  TransactionInstruction,
} from "@solana/web3.js";

export const parse = (
  ix: ParsedInstruction | PartiallyDecodedInstruction,
  tx: ParsedTransaction
) => {
  if ("parsed" in ix) {
    switch (ix.program) {
      case "spl-token":
        return <TokenDetailsCard {...props} />;
      case "bpf-loader":
        return <BpfLoaderDetailsCard {...props} />;
      case "bpf-upgradeable-loader":
        return <BpfUpgradeableLoaderDetailsCard {...props} />;
      case "system":
        return <SystemDetailsCard {...props} />;
      case "stake":
        return <StakeDetailsCard {...props} />;
      case "spl-memo":
        return <MemoDetailsCard {...props} />;
      case "spl-associated-token-account":
        return <AssociatedTokenDetailsCard {...props} />;
      case "vote":
        return <VoteDetailsCard {...props} />;
      default:
        return <UnknownDetailsCard {...props} />;
    }
  }

  const transactionIx = intoTransactionInstruction(tx, ix);

  if (isBonfidaBotInstruction(transactionIx)) {
    return <BonfidaBotDetailsCard key={key} {...props} />;
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
