// @flow
import type { BigNumber } from "bignumber.js";
import type { Account, Unit } from "../../types";
import type { CoreAccount } from "../../libcore/types";
import { libcoreAmountToBigNumber } from "../../libcore/buildBigNumber";

type Input = {
  coreAccount: CoreAccount,
  account: Account
};

type Output = Promise<{
  type: "fee",
  serverFee: BigNumber,
  baseReserve: BigNumber,
  unit: Unit
}>;

async function ripple({ coreAccount, account }: Input): Output {
  const rippleLikeAccount = await coreAccount.asRippleLikeAccount();
  const feesRaw = await rippleLikeAccount.getFees();
  const baseReserveRaw = await rippleLikeAccount.getBaseReserve();
  const baseReserve = await libcoreAmountToBigNumber(baseReserveRaw);
  const serverFee = await libcoreAmountToBigNumber(feesRaw);

  return {
    type: "fee",
    serverFee,
    baseReserve,
    unit: account.currency.units[0]
  };
}

export default ripple;
