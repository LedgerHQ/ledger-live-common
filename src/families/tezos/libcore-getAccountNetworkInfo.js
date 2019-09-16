// @flow
import type { Account } from "../../types";
import type { NetworkInfo, CoreTezosLikeAccount } from "./types";
import type { CoreAccount } from "../../libcore/types";
import { libcoreBigIntToBigNumber } from "../../libcore/buildBigNumber";

type Input = {
  coreAccount: CoreAccount,
  account: Account
};

type Output = Promise<NetworkInfo>;

async function tezos({ coreAccount }: Input): Output {
  const tezosLikeAccount: CoreTezosLikeAccount = await coreAccount.asTezosLikeAccount();
  const bigInt = await tezosLikeAccount.getFees();
  const fees = await libcoreBigIntToBigNumber(bigInt);
  return {
    family: "tezos",
    fees
  };
}

export default tezos;
