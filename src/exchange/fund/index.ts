import type { ExchangeProviderNameAndSignature } from "../";

const fundProviders: Record<
  string,
  {
    nameAndPubkey: Buffer;
    signature: Buffer;
    curve: string;
  }
> = {
  // FIXME: add FUND providers config here
};

const getProvider = (
  providerName: string
): ExchangeProviderNameAndSignature => {
  const res = fundProviders[providerName.toLowerCase()];

  if (!res) {
    throw new Error(`Unknown partner ${providerName}`);
  }

  return res;
};

export { getProvider };
