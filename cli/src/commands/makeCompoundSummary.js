// @flow

import { map } from "rxjs/operators";
import type {
  CompoundAccountSummary,
  LoansLikeArray,
} from "@ledgerhq/live-common/lib/compound/types";
import {
  formatCurrencyUnit,
  findCompoundToken,
} from "@ledgerhq/live-common/lib/currencies";
import { makeCompoundSummaryForAccount } from "@ledgerhq/live-common/lib/compound/logic";
import type { TokenAccount, Account } from "@ledgerhq/live-common/lib/types";
import { scan, scanCommonOpts } from "../scan";
import type { ScanCommonOpts } from "../scan";

const formatDate = (date: Date): string => {
  const ye = new Intl.DateTimeFormat("en", { year: "numeric" }).format(date);
  const mo = new Intl.DateTimeFormat("en", { month: "short" }).format(date);
  const da = new Intl.DateTimeFormat("en", { day: "2-digit" }).format(date);
  return `${da}-${mo}-${ye}`;
};

const createLoanHeader = (
  summary: CompoundAccountSummary,
  strings: string[],
  account: TokenAccount,
  parentAccount: Account
) => {
  const { totalSupplied, allTimeEarned } = summary;
  strings.push("\n");
  strings.push(
    `Compound Summary for account ${
      parentAccount ? parentAccount.id : account ? account.id : ""
    }`
  );
  strings.push("\n\n");
  strings.push("-------------------------------");
  strings.push("\n\n");
  strings.push(`${account.token.ticker} supplied`.padStart(22));
  strings.push(" | ");
  strings.push(`${account.token.ticker} earned`.padStart(22));
  strings.push(" | ");
  strings.push("\n");
  strings.push(
    `${formatCurrencyUnit(account.token.units[0], totalSupplied)}`.padStart(22)
  );
  strings.push(" | ");
  strings.push(
    `${formatCurrencyUnit(account.token.units[0], allTimeEarned)}`.padStart(22)
  );
  strings.push(" | ");
  strings.push("\n\n");
  strings.push("-------------------------------");
  strings.push("\n\n");

  return strings;
};

const createLoanDisplay = (
  loans: LoansLikeArray,
  strings: string[],
  title: string,
  account: TokenAccount
): string[] => {
  strings.push(title);
  strings.push("\n\n");
  strings.push(`Starting Date`.padStart(16));
  strings.push(" | ");
  strings.push(`Ending Date`.padStart(16));
  strings.push(" | ");
  strings.push(`${account.token.ticker}`.padStart(22));
  strings.push(" | ");
  strings.push(`${account.token.ticker} Earned`.padStart(22));
  strings.push(" | ");
  strings.push(`Interests Accrued (%)`.padStart(22));
  strings.push(" | ");
  strings.push(`Status`.padStart(22));
  strings.push(" | ");
  strings.push("\n\n");
  loans.forEach(
    ({
      startingDate,
      // $FlowFixMe it's amazing how much you piss me off
      endDate,
      amountSupplied,
      interestsEarned,
      percentageEarned,
      // $FlowFixMe it's amazing how much you piss me off
      status,
    }) => {
      strings.push(formatDate(startingDate).padStart(16));
      strings.push(" | ");
      strings.push((endDate ? formatDate(endDate) : "-").padStart(16));
      strings.push(" | ");
      strings.push(
        `${formatCurrencyUnit(
          account.token.units[0],
          amountSupplied
        )}`.padStart(22)
      );
      strings.push(" | ");
      strings.push(
        `${formatCurrencyUnit(
          account.token.units[0],
          interestsEarned
        )}`.padStart(22)
      );
      strings.push(" | ");
      strings.push(`${percentageEarned}`.padStart(22));
      strings.push(" | ");
      strings.push(`${status || ""}`.padStart(22));
      strings.push(" | ");
      strings.push("\n");
    }
  );

  strings.push("\n");
  strings.push("-------------------------------");
  strings.push("\n\n");

  return strings;
};

const compoundSummaryFormatter = {
  default: (summary: CompoundAccountSummary) => {
    const { opened, closed } = summary;
    return {
      ...summary,
      opened: opened.map(({ ...op }) => ({
        ...op,
        interestsEarned: op.interestsEarned.toString(),
        amountSupplied: op.amountSupplied.toString(),
        percentageEarned: op.percentageEarned.toString(),
      })),
      closed: closed.map(({ ...op }) => ({
        ...op,
        amountSupplied: op.amountSupplied.toString(),
        interestsEarned: op.interestsEarned.toString(),
        percentageEarned: op.percentageEarned.toString(),
      })),
      totalSupplied: summary.totalSupplied.toString(),
      allTimeEarned: summary.allTimeEarned.toString(),
    };
  },
  json: (summary: CompoundAccountSummary) => JSON.stringify(summary),
  cli: (summary: CompoundAccountSummary) => {
    const { opened, closed, account, parentAccount } = summary;

    if (opened.length === 0 && closed.length === 0) return summary;

    if (account.type !== "TokenAccount") return;

    const strings = [];

    createLoanHeader(summary, strings, account, parentAccount);

    createLoanDisplay(opened, strings, "OPENED LOANS", account);
    createLoanDisplay(closed, strings, "CLOSED LOANS", account);

    return strings.join("");
  },
};

export default {
  description: "Create a summary of compound operations (ETH)",
  args: [
    ...scanCommonOpts,
    {
      name: "format",
      alias: "f",
      type: String,
      typeDesc: Object.keys(compoundSummaryFormatter).join(" | "),
      desc: "how to display the data",
    },
  ],
  job: (
    opts: ScanCommonOpts & { format: $Keys<typeof compoundSummaryFormatter> }
  ) =>
    scan(opts).pipe(
      map((account) => {
        let result = [];
        if (!account.subAccounts.length) return result;

        const formatter = compoundSummaryFormatter[opts.format || "default"];

        account.subAccounts.forEach((s) => {
          if (!findCompoundToken(s.token)) return;

          const sum = makeCompoundSummaryForAccount(s, account);
          const summary = formatter(sum);
          result.push(summary);
        });

        return result.join("\n\n\n");
      })
    ),
};
