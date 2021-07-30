import React from "react";
import { Account } from "@ledgerhq/live-common/lib/types";
import { Box, Instance, render, Text } from "ink";
import { Observable } from "rxjs";
import { StateUpdater } from "../interactive";
import { formatCurrencyUnit } from "@ledgerhq/live-common/lib/currencies";

const AccountDisplay = ({ account }: { account: Account }) => {
  const balance = formatCurrencyUnit(account.unit, account.balance, {
    showCode: true,
  });

  return (
    <>
      <Box>
        <Text>{"  "}</Text>
        <Text>{account.name}</Text>
        <Text>{"  "}</Text>
        <Text>
          Balance: <Text color="green">{balance}</Text>
        </Text>
      </Box>
    </>
  );
};

const AccountsList = ({ accounts }: { accounts: Account[] }) => {
  return (
    <>
      {accounts.map((acc) => (
        <AccountDisplay key={acc.id} account={acc} />
      ))}
    </>
  );
};

export const args = [
  {
    name: "index",
    alias: "i",
    type: Number,
    desc: "select the account by index",
  },
];

export default {
  description: "list accounts",
  args: [...args],
  job: (opts: { index: number }, ctx, setCtx: (ctx: StateUpdater) => void) => {
    let instance: Instance;
    return new Observable((o) => {
      if (!ctx.accounts.length) {
        o.next("No accounts loaded yet. Use addAccounts");
        o.complete();
        return;
      }

      if (
        typeof opts.index !== "undefined" &&
        opts.index <= ctx.accounts.length - 1
      ) {
        const account = ctx.accounts[opts.index];
        setCtx({
          selectedAccount: account,
        });
        instance?.unmount();
        o.complete();
        return;
      }

      instance = render(<AccountsList accounts={ctx ? ctx.accounts : []} />);
    });
  },
};
