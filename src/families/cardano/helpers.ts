export function getBipPathObject(path: string): {
  path: string;
  account: number;
  chain: number;
  index: number;
} {
  const regEx = new RegExp(/^1852'\/1815'\/(\d*)'\/([012])\/(\d*)/);
  const result = path.match(regEx);
  if (result == null) {
    throw new Error("Invalid derivation path");
  }
  return {
    path: result[0],
    account: parseInt(result[1]),
    chain: parseInt(result[2]),
    index: parseInt(result[3]),
  };
}

export function getBipPathString({
  account,
  chain,
  index,
}: {
  account: number;
  chain: number;
  index: number;
}): string {
  return `1852'/1815'/${account}'/${chain}/${index}`;
}
