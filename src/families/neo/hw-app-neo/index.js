// @flow

import type Transport from "@ledgerhq/hw-transport";
import BIPPath from "bip32-path";
import { getAddressFromScriptHash, getScriptHashFromPublicKey } from "./crypto";
import { foreach } from "./utils";
const CLA = 0x80;
const PATH_SIZE = 4;
const CHUNK_SIZE = 240;
const SIGN = 0x02;
/**
 * Neo API
 *
 * @example
 */
export default class Neo {
  transport: Transport<any>;

  constructor(transport: Transport<any>) {
    this.transport = transport;
    transport.decorateAppAPIMethods(this, ["getAddress"], "NEO");
  }
  /**
   * Get Neo address for the given BIP 32 path.
   * @param path a path in BIP 32 format
   * @return an object with a publicKey and address
   * @example
   * neo.getAddress("44'/888'/0'/0/0").then(o => o.address)
   */
  async getAddress(path: string) {
    const bipPath = BIPPath.fromString(path).toPathArray();
    let buf = Buffer.alloc(4 * bipPath.length);
    bipPath.forEach((segment, index) => {
      buf.writeUInt32BE(segment, 4 * index);
    });
    const res = await this.transport.send(0x80, 0x04, 0, 0, buf);
    const publicKey = res.toString("hex").substring(0, 130);
    const scriptHash = getScriptHashFromPublicKey(publicKey);
    const address = getAddressFromScriptHash(scriptHash);
    return { address, publicKey };
  }

  /**
   * You can sign a transaction and retrieve DER signature given the raw
   * transaction and the BIP 32 path of the account to sign
   * @example
   eth.signTransaction("44'/888'/0'/0/0", "0800e1f505000000001405db7c48065877c220bb84b4f88ca9b9ef7e966e1405db7c48065877c220bb84b4f88ca9b9ef7e966e53c1087472616e736665726769090d990e0af2d6647682fb0ecca4b1871f04fe").then(result => ...)
   */
  async signTransaction(path: string, rawTxHex: string) {
    const bipPath = BIPPath.fromString(path).toPathArray();
    const pathBuffer = new Buffer(PATH_SIZE * bipPath.length);
    bipPath.forEach((element, index) => {
      pathBuffer.writeUInt32BE(element, 4 * index);
    });
    const rawTx = Buffer.concat([new Buffer(rawTxHex, "hex"), pathBuffer]);
    let buffers = [];
    let offset = 0;
    while (offset !== rawTx.length) {
      let chunkSize =
        offset + CHUNK_SIZE > rawTx.length ? rawTx.length - offset : CHUNK_SIZE;
      let buffer = new Buffer(chunkSize);
      rawTx.copy(buffer, 0, offset, offset + chunkSize);
      buffers.push(buffer);
      offset += chunkSize;
    }

    buffers = buffers.map((p, i) => {
      let startByte;
      if (i === buffers.length - 1) {
        startByte = 0x80;
      } else {
        startByte = 0x00;
      }
      return [startByte, p];
    });

    let response;
    return foreach(buffers, ([startByte, data]) => {
      return this.transport
        .send(CLA, SIGN, startByte, 0x00, data)
        .then(apduResponse => {
          response = apduResponse;
        });
    }).then(() => response);
  }
}
