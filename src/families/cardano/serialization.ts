import { BigNumber } from "bignumber.js";
import type {
  CardanoOutput,
  CardanoOutputRaw,
  CardanoResources,
  CardanoResourcesRaw,
  PaymentCredential,
  PaymentCredentialRaw,
  StakeCredential,
  StakeCredentialRaw,
  Token,
  TokenRaw,
} from "./types";

function toTokenRaw(r: Token): TokenRaw {
  return { ...r, amount: r.amount.toString() };
}

function fromTokenRaw(r: TokenRaw): Token {
  return { ...r, amount: new BigNumber(r.amount) };
}

function toPaymentCredentialRaw(r: PaymentCredential): PaymentCredentialRaw {
  return r;
}

function fromPaymentCredentialRaw(r: PaymentCredentialRaw): PaymentCredential {
  return r;
}

function toStakeCredentialRaw(r: StakeCredential): StakeCredentialRaw {
  return r;
}

function fromStakeCredentialRaw(r: StakeCredentialRaw): StakeCredential {
  return r;
}

function toCardanoOutputRaw(r: CardanoOutput): CardanoOutputRaw {
  return {
    ...r,
    amount: r.amount.toString(),
    tokens: r.tokens.map(toTokenRaw),
  };
}

function fromCardanoOutputRaw(r: CardanoOutputRaw): CardanoOutput {
  return {
    ...r,
    amount: new BigNumber(r.amount),
    tokens: r.tokens.map(fromTokenRaw),
  };
}
export function toCardanoResourceRaw(r: CardanoResources): CardanoResourcesRaw {
  return {
    internalCredentials: r.internalCredentials.map((c) =>
      toPaymentCredentialRaw(c)
    ),
    externalCredentials: r.externalCredentials.map((c) =>
      toPaymentCredentialRaw(c)
    ),
    stakeCredential: toStakeCredentialRaw(r.stakeCredential),
    utxos: r.utxos.map(toCardanoOutputRaw),
  };
}

export function fromCardanoResourceRaw(
  r: CardanoResourcesRaw
): CardanoResources {
  return {
    internalCredentials: r.internalCredentials.map((c) =>
      fromPaymentCredentialRaw(c)
    ),
    externalCredentials: r.externalCredentials.map((c) =>
      fromPaymentCredentialRaw(c)
    ),
    stakeCredential: fromStakeCredentialRaw(r.stakeCredential),
    utxos: r.utxos.map(fromCardanoOutputRaw),
  };
}
