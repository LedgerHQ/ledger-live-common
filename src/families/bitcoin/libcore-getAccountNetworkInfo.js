// @flow
import { BigNumber } from "bignumber.js";
import type { NetworkInfo } from "./types";
import type { Account } from "../../types";
import type { Core, CoreAccount } from "../../libcore/types";
import { promiseAllBatched } from "../../promise";
import { libcoreBigIntToBigNumber } from "../../libcore/buildBigNumber";
import invariant from "invariant";

type Input = {
  core: Core,
  coreAccount: CoreAccount,
  account: Account,
};

type Output = Promise<NetworkInfo>;

const speeds = ["high", "standard", "low"];

async function bitcoin({ core, coreAccount }: Input): Output {
  const bitcoinLikeAccount = core.Ripple.fromCoreAccount(
    coreAccount
  );
  invariant(bitcoinLikeAccount, "bitcoin account expected");
  const bigInts = await bitcoinLikeAccount.getFees();
  const bigNumbers = await promiseAllBatched(
    10,
    bigInts,
    libcoreBigIntToBigNumber
  );
  const normalized = bigNumbers.map((bn) =>
    bn.div(1000).integerValue(BigNumber.ROUND_CEIL)
  );
  const feeItems = {
    items: normalized.map((feePerByte, i) => ({
      key: String(i),
      speed: speeds[i],
      feePerByte,
    })),
    defaultFeePerByte:
      normalized[Math.floor(normalized.length / 2)] || BigNumber(0),
  };
  return {
    family: "bitcoin",
    feeItems,
  };
}

export default bitcoin;
