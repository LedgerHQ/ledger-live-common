import { getCryptoCurrencyById } from "@ledgerhq/cryptoassets";
import { DeviceModelId } from "@ledgerhq/devices";
import { pickSiblings } from "../../bot/specs";
import { AppSpec } from "../../bot/types";
import { Transaction } from "./types";
import { acceptTransferTransaction } from "./speculos-deviceActions";

const solana: AppSpec<Transaction> = {
  name: "Solana",
  appQuery: {
    model: DeviceModelId.nanoS,
    firmware: "<2",
    appName: "solana",
  },
  testTimeout: 1000,
  currency: getCryptoCurrencyById("solana_testnet"),
  mutations: [
    {
      name: "Transfer",
      maxRun: 1,
      deviceAction: acceptTransferTransaction,
      transaction: ({ account, siblings, bridge }) => {
        const transaction = bridge.createTransaction(account);
        const sibling = pickSiblings(siblings);
        const recipient = sibling.freshAddress;
        const amount = account.balance.div(9 + 0.2 * Math.random());
        return {
          transaction,
          updates: [
            { recipient },
            { amount },
            Math.random() > 0.5
              ? {
                  model: {
                    kind: "transfer",
                    uiState: {
                      memo: "a memo",
                    },
                  },
                }
              : undefined,
          ],
        };
      },
    },
  ],
};

export default {
  solana,
};
