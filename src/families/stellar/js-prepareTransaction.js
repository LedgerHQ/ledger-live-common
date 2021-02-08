// @flow
import getAccountNetworkInfo from "./js-getAccountNetworkInfo";

// FIXME: imports

const prepareTransaction = async (a, t) => {
  const networkInfo = t.networkInfo || (await getAccountNetworkInfo(a));
  invariant(networkInfo.family === "stellar", "stellar networkInfo expected");

  const fees = t.fees || networkInfo.fees;
  const baseReserve = t.baseReserve || networkInfo.baseReserve;

  if (
    t.networkInfo !== networkInfo ||
    t.fees !== fees ||
    t.baseReserve !== baseReserve
  ) {
    return {
      ...t,
      networkInfo,
      fees,
      baseReserve,
    };
  }

  return t;
};

export default prepareTransaction;
