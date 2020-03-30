// @flow
import { BigNumber } from "bignumber.js";
import type { Account } from "../../types";
import type { NetworkInfo, CoreTezosLikeAccount } from "./types";
import type { Core, CoreAccount } from "../../libcore/types";
import { libcoreBigIntToBigNumber } from "../../libcore/buildBigNumber";
import invariant from "invariant";

type Input = {
  core: Core,
  coreAccount: CoreAccount,
  account: Account,
};

type Output = Promise<NetworkInfo>;

async function tezos({ core, coreAccount }: Input): Output {
  const tezosLikeAccount: CoreTezosLikeAccount = await new core.Tezos().fromCoreAccount(
    coreAccount
  );
  invariant(tezosLikeAccount, "tezos account expected");
  const bigInt = await tezosLikeAccount.getFees();
  const networkFees = await libcoreBigIntToBigNumber(bigInt);
  // workaround of a bug on server side. set some boundaries.
  const fees = BigNumber.min(BigNumber.max(2500, networkFees), 30000);
  return {
    family: "tezos",
    fees,
  };
}

export default tezos;
