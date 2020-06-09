// @flow
export function serializePathv1(path) {
  if (path == null || path.length < 3) {
    throw new Error("Invalid path.");
  }
  if (path.length > 10) {
    throw new Error("Invalid path. Length should be <= 10");
  }
  const buf = Buffer.alloc(1 + 4 * path.length);
  buf.writeUInt8(path.length, 0);
  for (let i = 0; i < path.length; i += 1) {
    let v = path[i];
    if (i < 3) {
      // eslint-disable-next-line no-bitwise
      v |= 0x80000000; // Harden
    }
    buf.writeInt32LE(v, 1 + i * 4);
  }
  return buf;
}
