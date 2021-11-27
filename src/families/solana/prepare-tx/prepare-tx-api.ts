import {
  Config,
  findAssociatedTokenAccountPubkey,
  getAssociatedTokenAccountCreationFee,
  getBalance,
  getMaybeTokenAccount,
  getTxFeeCalculator,
} from "../api";
import { PrepareTxAPI } from "../types";

export function getPrepareTxAPI(config: Config): PrepareTxAPI {
  return {
    findAssociatedTokenAccountPubkey,
    getAssociatedTokenAccountCreationFee:
      getAssociatedTokenAccountCreationFee(config),
    getBalance: getBalance(config),
    getMaybeTokenAccount: getMaybeTokenAccount(config),
    getTxFeeCalculator: getTxFeeCalculator(config),
    config,
  };
}
