// @flow
import React, { useEffect, useState } from "react";
import { Account } from "@ledgerhq/live-common/lib/types";
import { scanCommonOpts } from "../scan";
import type { ScanCommonOpts } from "../scan";
import { Box, render, Text, useInput, Newline } from "ink";
import Spinner from "ink-spinner";
import { from } from "rxjs";
// import { formatCurrencyUnit } from "@ledgerhq/live-common/lib/currencies";

const AccountDisplay = ({
  account,
  active,
}: {
  account: Account;
  active: boolean;
}) => {
  // const balance = formatCurrencyUnit(account.unit, account.balance, {
  //   showCode: true,
  // });

  return (
    <>
      <Box>
        {active ? (
          <Text color="blue">{" > "}</Text>
        ) : (
          <Text color="blue">{"   "}</Text>
        )}
        <Text color={active ? "blue" : "white"}>{account.name}</Text>
      </Box>
      {/* <Newline /> */}
      {/* <Text>
        Balance: <Text color="green">{balance}</Text> (
        {account.operations.length}ops)
      </Text>
      <Text>
        Fresh Info: <Text color="green">{account.freshAddress}</Text>
        on
        <Text color="green">{account.freshAddressPath}</Text>
      </Text>
      <Text>
        Derivation Info:{" "}
        <Text color="green">
          {account.derivationMode}#{account.index}
        </Text>
      </Text>
      {account.xpub ? (
        <Text>
          xpub: <Text color="green">{account.xpub}</Text>
        </Text>
      ) : null} */}
      {/* <Newline /> */}
    </>
  );
};

const AccountsList = ({ accounts }: { accounts: Account[] }) => {
  const [active, setActive] = useState(0);
  const [order, setOrder] = useState(accounts);

  useInput((input, key) => {
    if (key.downArrow || input === "j") {
      setActive((ac) => {
        if (ac === accounts.length - 1) {
          return 0;
        }
        return ac + 1;
      });
    }

    if (key.upArrow || input === "k") {
      setActive((ac) => {
        if (ac === 0) {
          return accounts.length - 1;
        }
        return ac - 1;
      });
    }
  });

  useEffect(() => {
    if (active === 0) {
      setOrder(accounts);
    } else if (active > 0) {
      const end = accounts.slice(active);
      const first = accounts.slice(0, active);
      setOrder([...end, ...first]);
    }
  }, [active, accounts]);

  return (
    <>
      {order.map((acc, i) => (
        <AccountDisplay key={acc.id} account={acc} active={i === 0} />
      ))}
    </>
  );
};

export default {
  description: "list accounts",
  args: [...scanCommonOpts],
  job: (opts: ScanCommonOpts & { format: string }, ctx) => {
    if (!ctx.accounts.length) {
      return from("No accounts loaded yet. Use addAccounts");
    }
    render(<AccountsList accounts={ctx ? ctx.accounts : []} />);
  },
};
