import { BigNumber } from "bignumber.js";
import type {
  CardanoResources,
  CardanoResourcesRaw,
  PaymentCredential,
  PaymentCredentialRaw,
  Token,
  TokenRaw,
} from "./types";

function toTokenRaw(r: Token): TokenRaw {
  return Object.assign(r, { value: r.value.toString() });
}

function fromTokenRaw(r: TokenRaw): Token {
  return { ...r, value: new BigNumber(r.value) };
}

function toPaymentCredentialRaw(r: PaymentCredential): PaymentCredentialRaw {
  return {
    ...r,
    balance: r.balance.toString(),
    tokens: r.tokens.map((t) => toTokenRaw(t)),
  };
}

function fromPaymentCredentialRaw(r: PaymentCredentialRaw): PaymentCredential {
  return {
    ...r,
    balance: new BigNumber(r.balance),
    tokens: r.tokens.map((t) => fromTokenRaw(t)),
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
  };
}
