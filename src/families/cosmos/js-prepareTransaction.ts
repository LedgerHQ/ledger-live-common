import { Account } from "../../types";
import { Transaction } from "./types";
import { simulate } from "./api/Cosmos";
import BigNumber from "bignumber.js";

const prepareTransaction = async (
  a: Account,
  t: Transaction
): Promise<Transaction> => {
  // create temporary msg
  // sign it
  // send to simulate to get fees

  // we need ot abstract msg and legacyMsg builder method

  const msg = {};
  //const data = await simulate(msg);
  //t.fees = new BigNumber(data.gas_info.gas_used);
  t.fees = new BigNumber(1);

  return t;
};

export default prepareTransaction;
