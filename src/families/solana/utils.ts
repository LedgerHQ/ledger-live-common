export const assertUnreachable = (value: never) => {
  throw new Error("unreachable assertion failed");
};

export const reduceDefined = <E, T>(
  mapper: (el: E) => T | undefined,
  coll: E[]
): T[] => {
  return coll.map(mapper).filter((item): item is T => item !== undefined);
};
