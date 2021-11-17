export const assertUnreachable = (value: never) => {
  throw new Error("unreachable assertion failed");
};

export async function drainSeqAsyncGen<T>(...asyncGens: AsyncGenerator<T>[]) {
  const items: T[] = [];
  for (const gen of asyncGens) {
    for await (const item of gen) {
      items.push(item);
    }
  }
  return items;
}
