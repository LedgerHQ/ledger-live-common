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

export const toCBOR = (from: string, tx: Transaction) => {
  const {
    recipient,
    method,
    version,
    nonce,
    gasLimit,
    gasPremium,
    gasFeeCap,
    params,
    amount,
  } = tx;
  const answer: any[] = [];

  // "version" field
  answer.push(version);

  // "to" field
  answer.push(Buffer.from(recipient, "hex"));

  // "from" field
  answer.push(Buffer.from(from, "hex"));

  // "nonce" field
  answer.push(nonce);

  // "value"
  let buf = bigintToArray(amount);
  answer.push(buf);

  // "gaslimit"
  answer.push(gasLimit);

  // "gasfeecap"
  buf = bigintToArray(gasFeeCap);
  answer.push(buf);

  // "gaspremium"
  buf = bigintToArray(gasPremium);
  answer.push(buf);

  // "method"
  answer.push(method);

  if (params) answer.push(params);
  else answer.push(Buffer.alloc(0));

  return cbor.encode(answer);
};
