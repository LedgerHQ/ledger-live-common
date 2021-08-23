import type {
  Transaction,
} from "../../families/elrond/types";
import invariant from "invariant";
import { getCryptoCurrencyById, parseCurrencyUnit } from "../../currencies";
import { pickSiblings } from "../../bot/specs";
import type { AppSpec } from "../../bot/types";
import { toOperationRaw } from "../../account";
import { DeviceModelId } from "@ledgerhq/devices";

const currency = getCryptoCurrencyById("elrond");
const EXISTENTIAL_DEPOSIT = parseCurrencyUnit(currency.units[0], "1.0");
const ELROND_MIN_SAFE = parseCurrencyUnit(currency.units[0], "0.05");
const elrondSpec: AppSpec<Transaction> = {
  name: "Elrond",
  currency: getCryptoCurrencyById("elrond"),
  appQuery: {
    model: DeviceModelId.nanoS,
    appName: "Elrond",
  },
  testTimeout: 2 * 60 * 1000,
  transactionCheck: ({ maxSpendable }) => {
    invariant(maxSpendable.gt(ELROND_MIN_SAFE), "balance is too low");
  },
  test: ({ operation, optimisticOperation }) => {
    const opExpected: Record<string, any> = toOperationRaw({
      ...optimisticOperation,
    });
    delete opExpected.value;
    delete opExpected.fee;
    delete opExpected.date;
    delete opExpected.blockHash;
    delete opExpected.blockHeight;
    expect(toOperationRaw(operation)).toMatchObject(opExpected);
  },
  mutations: [
    {
      name: "send 50%~",
      maxRun: 1,
      transaction: ({ account, siblings, bridge }) => {
        const sibling = pickSiblings(siblings, 2);
        let amount = account.spendableBalance
          .div(1.9 + 0.2 * Math.random())
          .integerValue();

        if (!sibling.used && amount.lt(EXISTENTIAL_DEPOSIT)) {
          invariant(
            account.spendableBalance.gt(
              EXISTENTIAL_DEPOSIT.plus(ELROND_MIN_SAFE)
            ),
            "send is too low to activate account"
          );
          amount = EXISTENTIAL_DEPOSIT.plus(ELROND_MIN_SAFE);
        }

        return {
          transaction: bridge.createTransaction(account),
          updates: [
            {
              recipient: pickSiblings(siblings, 1).freshAddress,
            },
            {
              amount,
            },
          ],
        };
      },
    },
  ]
};

export default {
  elrondSpec,
};