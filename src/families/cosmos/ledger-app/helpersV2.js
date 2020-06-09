// @flow

export function serializePathv2(path) {
  const buf = Buffer.alloc(20);
  // HACK : without the >>>,
  // the bitwise implicitly casts the result to be a signed int32,
  // which fails the internal type check of Buffer in case of overload.
  buf.writeUInt32LE((0x80000000 | path[0]) >>> 0, 0);
  buf.writeUInt32LE((0x80000000 | path[1]) >>> 0, 4);
  buf.writeUInt32LE((0x80000000 | path[2]) >>> 0, 8);
  buf.writeUInt32LE(path[3], 12);
  buf.writeUInt32LE(path[4], 16);

  return buf;
}
