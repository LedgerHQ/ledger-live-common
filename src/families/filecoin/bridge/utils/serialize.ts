import cbor from "cbor";
import { Transaction } from "../../types";

function bigintToArray(v) {
  let tmp;

  // Adding byte sign
  let signByte = "00";
  if (BigInt(v) < 0) {
    signByte = "01";
  }

  if (v === "") {
    // to test with null bigint
    return Buffer.from(signByte, "hex");
  } else {
    tmp = BigInt(v).toString(16);
    // not sure why it is not padding and buffer does not like it
    if (tmp.length % 2 === 1) tmp = "0" + tmp;
  }

  return Buffer.concat([Buffer.from(signByte, "hex"), Buffer.from(tmp, "hex")]);
}

export const toCBOR = (tc: Transaction) => {
  const answer: any[] = [];

  // "version" field
  answer.push(tc.version);

  // "to" field
  answer.push(Buffer.from(tc.message.to, "hex"));

  // "from" field
  answer.push(Buffer.from(tc.recipient, "hex"));

  // "nonce" field
  answer.push(tc.nonce);

  // "value"
  let buf = bigintToArray(tc.amount);
  answer.push(buf);

  // "gaslimit"
  answer.push(parseInt(tc.gaslimit, 10));

  // "gasfeecap"
  buf = bigintToArray(tc.message.gasfeecap);
  answer.push(buf);

  // "gaspremium"
  buf = bigintToArray(tc.message.gaspremium);
  answer.push(buf);

  // "method"
  answer.push(tc.message.method);

  if (tc.message.params) {
    // "params"
    answer.push(tc.message.params);
  } else {
    answer.push(Buffer.alloc(0));
  }

  return cbor.encode(answer);
};
