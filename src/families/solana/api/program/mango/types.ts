//import { Config } from "@blockworks-foundation/mango-client";
import { TransactionInstruction } from "@solana/web3.js";

// TODO: do we need to bring the whole package just for the config list?
const Config = {
  ids: () => {
    return {
      groups: [] as any[],
    };
  },
};

// note: mainnet.1 suffices since its a superset of mainnet.0
const mangoGroups = Config.ids().groups.filter(
  (group) => group.name !== "mainnet.0"
);

export const isMangoInstruction = (instruction: TransactionInstruction) => {
  return mangoGroups
    .map((group) => group.mangoProgramId.toBase58())
    .includes(instruction.programId.toBase58());
};

const INSTRUCTION_LOOKUP: { [key: number]: string } = {
  0: "InitMangoGroup",
  1: "InitMangoAccount",
  2: "Deposit",
  3: "Withdraw",
  4: "AddSpotMarket",
  5: "AddToBasket",
  6: "Borrow",
  7: "CachePrices",
  8: "CacheRootBanks",
  9: "PlaceSpotOrder",
  10: "AddOracle",
  11: "AddPerpMarket",
  12: "PlacePerpOrder",
  13: "CancelPerpOrderByClientId",
  14: "CancelPerpOrder",
  15: "ConsumeEvents",
  16: "CachePerpMarkets",
  17: "UpdateFunding",
  18: "SetOracle",
  19: "SettleFunds",
  20: "CancelSpotOrder",
  21: "UpdateRootBank",
  22: "SettlePnl",
  23: "SettleBorrow",
  24: "ForceCancelSpotOrders",
  25: "ForceCancelPerpOrders",
  26: "LiquidateTokenAndToken",
  27: "LiquidateTokenAndPerp",
  28: "LiquidatePerpMarket",
  29: "SettleFees",
  30: "ResolvePerpBankruptcy",
  31: "ResolveTokenBankruptcy",
  32: "InitSpotOpenOrders",
  33: "RedeemMngo",
  34: "AddMangoAccountInfo",
  35: "DepositMsrm",
  36: "WithdrawMsrm",
  37: "ChangePerpMarketParams",
};

export const parseMangoInstructionTitle = (
  instruction: TransactionInstruction
): string | undefined => {
  const code = instruction.data[0];

  return INSTRUCTION_LOOKUP[code];
};
