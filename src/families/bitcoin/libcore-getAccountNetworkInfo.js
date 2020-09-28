// @flow
import { BigNumber } from "bignumber.js";
import type { NetworkInfo } from "./types";
import type { Account } from "../../types";
import type { CoreAccount } from "../../libcore/types";
import { promiseAllBatched } from "../../promise";
import { libcoreBigIntToBigNumber } from "../../libcore/buildBigNumber";

type Input = {
  coreAccount: CoreAccount,
  account: Account,
};

type Output = Promise<NetworkInfo>;

const speeds = ["high", "standard", "low"];
const speedStepIfEqual = 1;

async function bitcoin({ coreAccount }: Input): Output {
  const bitcoinLikeAccount = await coreAccount.asBitcoinLikeAccount();
  const bigInts = await bitcoinLikeAccount.getFees();
  const bigNumbers = await promiseAllBatched(
    10,
    bigInts,
    libcoreBigIntToBigNumber
  );
  const normalized = bigNumbers
    .map((bn) => bn.div(1000).integerValue(BigNumber.ROUND_CEIL))
    .reduce(
      (out, num, i) => [
        ...out,
        i > 0 && out[i - 1].gte(num) ? out[i - 1].plus(speedStepIfEqual) : num,
      ],
      []
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
