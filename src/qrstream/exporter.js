// @flow

import { Buffer } from "buffer";

function chunkSubstr(str, size) {
  const numChunks = Math.ceil(str.length / size);
  const chunks = new Array(numChunks);
  for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
    chunks[i] = str.substr(o, size);
  }
  return chunks;
}

/**
 * export data into a chunk of string that you can generate a QR with
 * @param data the complete data to encode in a series of QR code frames
 * @param dataSize the number of bytes to use from data for each frame
 * @param variants (>= 1) the total number of loops to repeat the frames with varying a nonce. More there is, better the chance to not be stuck on a frame. Experience has shown some QR Code are harder to read.
 *
 * each frame is a base64 of:
 *   1 byte: nonce
 *   2 bytes: total number of frames
 *   2 bytes: index of frame
 *   variable data
 *
 * @memberof bridgestream/exporter
 */
export function makeFrames(
  data: string,
  dataSize: number,
  variants: number = 1
): string[] {
  const dataChunks = chunkSubstr(data, dataSize);
  const r = [];

  for (let nonce = 0; nonce < variants; nonce++) {
    for (let i = 0; i < dataChunks.length; i++) {
      const data = dataChunks[i];
      const head = Buffer.alloc(5);
      head.writeUInt8(1, nonce);
      head.writeUInt16BE(dataChunks.length, 1);
      head.writeUInt16BE(i, 3);
      r.push(Buffer.concat([head, Buffer.from(data)]).toString("base64"));
    }
  }
  return r;
}
