// @flow
import { BigNumber } from "bignumber.js";
import type { Account } from "../../types";
import type { NetworkInfo, CoreStellarLikeAccount } from "./types";
import type { CoreAccount } from "../../libcore/types";
import { libcoreAmountToBigNumber } from "../../libcore/buildBigNumber";

type Input = {
  coreAccount: CoreAccount,
  account: Account
};

type Output = Promise<NetworkInfo>;

async function stellar({ coreAccount }: Input): Output {
  const stellarLikeAccount: CoreStellarLikeAccount = await coreAccount.asStellarLikeAccount();
  // We disable this because node doesn't return us any fee stats ATM
  // const baseFees = await stellarLikeAccount.getFeeStats();
  // const lastBaseFee = await baseFees.getLastBaseFee();

  return {
    family: "stellar",
    // fees: BigNumber(lastBaseFee),
    fees: BigNumber("100"),
    baseReserve: await libcoreAmountToBigNumber(
      await stellarLikeAccount.getBaseReserve()
    )
  };
}

export default stellar;
