const invariant = require("invariant");
const path = require("path");
const { readFileJSON, JSONstringifyReadableArray } = require("../utils");

const inferParentCurrency = common =>
  common.blockchain_name === "foundation"
    ? "ethereum"
    : common.blockchain_name === "ropsten"
      ? "ethereum_ropsten"
      : null;

module.exports = {
  path: "tokens/ethereum/erc20",

  outputTemplate: data =>
    'require("../../../data/tokens").add("erc20", ' +
    JSONstringifyReadableArray(data) +
    ");",

  loader: ({ folder, id }) =>
    Promise.all([
      readFileJSON(path.join(folder, id, "common.json")),
      readFileJSON(path.join(folder, id, "ledger_signature.json"))
    ]).then(([common, ledgerSignature]) => {
      const name = common.name;
      const ticker = common.ticker.toUpperCase();
      const magnitude = common.decimals;
      const contractAddress = common.contract_address;
      const parentCurrency = inferParentCurrency(common);
      try {
        invariant(
          typeof parentCurrency === "string" && parentCurrency,
          "parentCurrency is required"
        );
        invariant(typeof name === "string" && name, "name is required");
        invariant(typeof name === "string" && name, "name is required");
        invariant(typeof id === "string" && id, "id is required");
        invariant(
          typeof ledgerSignature === "string" && ledgerSignature,
          "ledgerSignature is required"
        );
        invariant(
          ledgerSignature.length % 2 === 0 &&
            ledgerSignature.match(/^[0-9a-fA-F]+$/g),
          "ledgerSignature is hexa"
        );
        invariant(
          typeof contractAddress === "string" && contractAddress,
          "contractAddress is required"
        );
        invariant(
          contractAddress.length === 42 &&
            contractAddress.match(/^0x[0-9a-fA-F]+$/g),
          "contractAddress is eth address"
        );
        invariant(typeof ticker === "string" && ticker, "ticker is required");
        invariant(
          ticker.match(/^[0-9A-Z]+$/g),
          "ticker alphanum uppercase expected"
        );
        invariant(
          typeof magnitude === "number" &&
            isFinite(magnitude) &&
            magnitude >= 0 &&
            magnitude % 1 === 0,
          "magnitude expected positive integer"
        );
      } catch (e) {
        console.error("Validate error for '" + ticker + "' ERC20: " + e);
        console.log({ ticker, common, ledgerSignature });
        return null;
      }
      return [
        parentCurrency,
        id,
        ticker,
        magnitude,
        name,
        ledgerSignature,
        contractAddress
      ];
    })
};
