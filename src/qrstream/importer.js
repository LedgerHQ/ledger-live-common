// @flow

import { Buffer } from "buffer";

type Frame = {
  framesCount: number,
  index: number,
  data: string
};

/**
 * reduce frames data array to add on more chunk to it.
 * As a user of this function, consider the frames to be a black box and use the available functions to extract things.
 * @memberof bridgestream/importer
 */
export function parseFramesReducer(
  framesOrNull: ?(Frame[]),
  chunkStr: string,
  logger?: ?typeof console
): Frame[] {
  const frames = framesOrNull || [];
  try {
    const chunk = Buffer.from(chunkStr, "base64");
    const head = chunk.slice(0, 5);
    const framesCount = head.readUInt16BE(1);
    const index = head.readUInt16BE(3);
    const data = chunk.slice(5).toString();
    if (framesCount <= 0) {
      throw new Error("invalid framesCount");
    }
    if (index < 0 || index >= framesCount) {
      throw new Error("invalid index");
    }
    if (frames.length > 0 && framesCount !== frames[0].framesCount) {
      throw new Error(
        `different dataLength. Got: ${framesCount}, Expected: ${
          frames[0].framesCount
        }`
      );
    }
    if (frames.some(c => c.index === index)) {
      // chunk already exists. we are just ignoring
      return frames;
    }
    return frames.concat({ framesCount, index, data });
  } catch (e) {
    if (logger) logger.warn(`Invalid chunk ${e.message}`);
    return frames;
  }
}

// retrieve the total number of frames
export const totalNumberOfFrames = (frames: Frame[]): ?number =>
  frames.length > 0 ? frames[0].framesCount : null;

// get the currently captured number of frames
export const currentNumberOfFrames = (frames: Frame[]): number => frames.length;

/**
 * check if the frames have all been retrieved
 * @memberof bridgestream/importer
 */
export const areFramesComplete = (frames: Frame[]): boolean =>
  totalNumberOfFrames(frames) === currentNumberOfFrames(frames);

/**
 * return final result of the frames. assuming you have checked `areFramesComplete`
 * @memberof bridgestream/importer
 */
export function framesToResult(frames: Frame[]): string {
  return frames
    .slice(0)
    .sort((a, b) => a.index - b.index)
    .map(frame => frame.data)
    .join("");
}
