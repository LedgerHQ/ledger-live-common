// @flow
import type { Account } from "../../types";
import type { NetworkInfo } from "./types";
import type { Core, CoreAccount } from "../../libcore/types";
import { libcoreBigIntToBigNumber } from "../../libcore/buildBigNumber";
import invariant from "invariant";

type Input = {
  core: Core,
  coreAccount: CoreAccount,
  account: Account,
};

type Output = Promise<NetworkInfo>;

async function ethereum({ core, coreAccount }: Input): Output {
  const ethereumLikeAccount = core.Ethereum.fromCoreAccount(
    coreAccount
  );
  invariant(ethereumLikeAccount, "ethereum account expected");
  const bigInt = await ethereumLikeAccount.getGasPrice();
  const gasPrice = await libcoreBigIntToBigNumber(bigInt);
  return {
    family: "ethereum",
    gasPrice,
  };
}

export default ethereum;
