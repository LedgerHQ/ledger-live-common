import { IX_STRUCTS, TokenInstructionType } from "./instructions/token/types";

type SplToken<T extends TokenInstructionType> = {
  program: "spl-token";
  info: typeof IX_STRUCTS[T];
};

type BpfLoader = {
  program: "bpf-loader";
};

type BpfUpgradableLoader = {
  program: "bpf-upgradeable-loader";
};

type System = {
  program: "system";
};

type Stake = {
  program: "stake";
};

type SplMemo = {
  program: "spl-memo";
};

type SplAssociatedTokenAccount = {
  program: "spl-associated-token-account";
};

type Vote = {
  program: "vote";
};

type Program =
  | SplToken<TokenInstructionType>
  | BpfLoader
  | BpfUpgradableLoader
  | System
  | Stake
  | SplMemo
  | SplAssociatedTokenAccount
  | Vote;
