// @flow
import { useState, useEffect, useMemo, useRef } from "react";

import type { Transaction } from "./types";

export function useFeesStrategy(t: Transaction) {
  const [feeStrategy, setFeesStrategy] = useState([]);

  useEffect(() => {
    const strategies = [
      { name: "low", amount: t.networkInfo?.gasPrice.min },
      { name: "medium", amount: t.networkInfo?.gasPrice.initial },
      { name: "high", amount: t.networkInfo?.gasPrice.max },
    ];

    setFeesStrategy(strategies);
  }, [t]);

  return feeStrategy;
}
