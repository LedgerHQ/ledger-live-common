const validHexRegExp = new RegExp(/[0-9A-Fa-f]{6}/g);
const validBase64RegExp = new RegExp(
  /^(?:[A-Za-z\d+/]{4})*(?:[A-Za-z\d+/]{3}=|[A-Za-z\d+/]{2}==)?$/
);

// FIXME - Get this return code from filecoin package, not from here
export const isNoErrorReturnCode = (code: number) => code === 0x9000;

export const getPath = (path: string) =>
  path && path.substr(0, 2) !== "m/" ? `m/${path}` : path;

export const isValidHex = (msg: string) => validHexRegExp.test(msg);
export const isValidBase64 = (msg: string) => validBase64RegExp.test(msg);

export const isError = (r: { return_code: number; error_message: string }) => {
  if (!isNoErrorReturnCode(r.return_code))
    throw new Error(`${r.return_code} - ${r.error_message}`);
};

export const getBufferFromString = (message: string): Buffer =>
  isValidHex(message)
    ? Buffer.from(message, "hex")
    : isValidBase64(message)
    ? Buffer.from(message, "base64")
    : Buffer.from(message);
