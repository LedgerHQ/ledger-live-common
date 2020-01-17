// @flow
import bs58check from "bs58check";

export const decode58Check = (base58: string) =>
  Buffer.from(bs58check.decode(base58)).toString("hex");

export const encode58Check = (hex: string) => bs58check.encode(Buffer.from(hex, "hex"));

export const hexToAscii = (hex: string) => {
	let str = '';
	for (var n = 0; n < hex.length; n += 2) {
		str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
	}
	return str;
}
