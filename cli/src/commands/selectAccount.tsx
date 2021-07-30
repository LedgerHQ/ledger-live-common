import React, { useCallback, useEffect, useState } from "react";
import { Account } from "@ledgerhq/live-common/lib/types";
import { scanCommonOpts } from "../scan";
import type { ScanCommonOpts } from "../scan";
import { Box, render, Text, useInput, Newline } from "ink";
import Spinner from "ink-spinner";
import { Observable } from "rxjs";
import { StateUpdater } from "../interactive";
import { formatCurrencyUnit } from "@ledgerhq/live-common/lib/currencies";

const AccountDisplay = ({
  account,
  active,
}: {
  account: Account;
  active: boolean;
}) => {
  const balance = formatCurrencyUnit(account.unit, account.balance, {
    showCode: true,
  });

  return (
    <>
      <Box>
        {active ? (
          <Text color="blue">{" > "}</Text>
        ) : (
          <Text color="blue">{"   "}</Text>
        )}
        <Text color={active ? "blue" : "white"}>{account.name}</Text>
        <Text>
          Balance: <Text color="green">{balance}</Text> (
          {account.operations.length}ops)
        </Text>
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

const AccountsList = ({
  accounts,
  setCtx,
}: {
  accounts: Account[];
  setCtx: (ctx: StateUpdater) => void;
}) => {
  const [active, setActive] = useState(0);
  const [order, setOrder] = useState(accounts);

  const selectAccount = useCallback(() => {
    setCtx({
      selectedAccount: accounts[active],
    });
  }, [setCtx, active, accounts]);

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

    if (key.return) {
      selectAccount();
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
  job: (
    opts: ScanCommonOpts & { format: string },
    ctx,
    setCtx: (ctx: StateUpdater) => void
  ) =>
    new Observable((o) => {
      if (!ctx.accounts.length) {
        o.next("No accounts loaded yet. Use addAccounts");
        o.complete();
      }

      const setter = (ctx: StateUpdater) => {
        setCtx(ctx);
        render(<Box />);
        o.complete();
      };

      render(
        <AccountsList accounts={ctx ? ctx.accounts : []} setCtx={setter} />
      );
    }),
};
