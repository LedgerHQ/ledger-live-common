export const PARSED_PROGRAMS = {
  SPL_ASSOCIATED_TOKEN_ACCOUNT: "spl-associated-token-account",
  BPF_LOADER: "bpf-loader",
  BPF_UPGRADEABLE_LOADER: "bpf-upgradeable-loader",
  SPL_MEMO: "spl-memo",
  STAKE: "stake",
  SYSTEM: "system",
  SPL_TOKEN: "spl-token",
  VOTE: "vote",
} as const;

export const NON_PARSED_PROGRAMS = {
  BONFIDA_BOT: "bonfida-bot",
  MANGO: "mango",
  SERUM: "serum",
  TOKEN_SWAP: "token-swap",
  TOKEN_LENDING: "token-lending",
  WORMHOLE: "wormhole",
} as const;
