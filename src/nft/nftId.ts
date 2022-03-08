export const encodeNftId = (
  accountId: string,
  contract: string,
  tokenId: string,
  currencyId: string
): string => {
  return `${accountId}+${contract}+${tokenId}+${currencyId}`;
};

export const decodeNftId = (id: string): unknown => {
  const [accountId, contract, tokenId, currencyId] = id.split("+");

  return {
    accountId,
    contract,
    tokenId,
    currencyId,
  };
};
