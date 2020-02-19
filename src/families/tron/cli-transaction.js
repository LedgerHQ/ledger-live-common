// @flow

import { from, Observable } from "rxjs";
import { map } from "rxjs/operators";
import invariant from "invariant";
import flatMap from "lodash/flatMap";
import zipWith from "lodash/zipWith";
import { getAccountCurrency } from "../../account";
import { getTronSuperRepresentativeData } from "../../api/Tron";
import type {
  Transaction,
  Account,
  AccountLike,
  AccountLikeArray
} from "../../types";
import type { SuperRepresentativeData, Vote } from "./types";

const options = [
  {
    name: "token",
    alias: "t",
    type: String,
    desc: "use an token account children of the account"
  },
  {
    name: "mode",
    type: String,
    desc: "mode of transaction: send, freeze, unfreeze"
  },
  {
    name: "duration",
    type: String,
    desc: "duration in day"
  },
  {
    name: "resource",
    type: String,
    desc: "reward ENERGY or BANDWIDTH"
  },
  {
    name: "tronVoteAddress",
    type: String,
    multiple: true,
    desc: "address of the super representative voting"
  },
  {
    name: "tronVoteCount",
    type: String,
    multiple: true,
    desc: "number of votes for the vote address"
  }
];

function inferAccounts(account: Account, opts: Object): AccountLikeArray {
  invariant(account.currency.family === "tron", "tron family");
  if (!opts.token) return [account];
  return opts.token.map(token => {
    const subAccounts = account.subAccounts || [];
    if (token) {
      const subAccount = subAccounts.find(t => {
        const currency = getAccountCurrency(t);
        return (
          token.toLowerCase() === currency.ticker.toLowerCase() ||
          token.toLowerCase() === currency.id
        );
      });
      if (!subAccount) {
        throw new Error(
          "token account '" +
            token +
            "' not found. Available: " +
            subAccounts.map(t => getAccountCurrency(t).ticker).join(", ")
        );
      }
      return subAccount;
    }
  });
}

function inferTransactions(
  transactions: Array<{ account: AccountLike, transaction: Transaction }>,
  opts: Object
): Transaction[] {
  const voteAddresses: string[] = opts["tronVoteAddress"] || [];
  const voteCounts: number[] = (opts["tronVoteCount"] || []).map(value => {
    const intValue = parseInt(value);
    if (Number.isInteger(intValue)) {
      return intValue;
    } else {
      throw new Error(`Invalid integer: ${value}`);
    }
  });
  const votes: Vote[] = zipWith(voteAddresses, voteCounts, (a, c) => ({
    address: a,
    voteCount: c
  }));

  return flatMap(transactions, ({ transaction, account }) => {
    invariant(transaction.family === "tron", "tron family");

    return {
      ...transaction,
      mode: opts.mode || "send",
      family: "tron",
      subAccountId: account.type === "TokenAccount" ? account.id : null,
      resource: opts.resource ? opts.resource.toUpperCase() : undefined,
      votes
    };
  });
}

const formatOptStr = (str: ?string): string => str || "";

const superRepresentativesFormatters = {
  json: srData => JSON.stringify(srData),
  default: srData => {
    const headerList = 'address "name" url voteCount brokerage isJobs';

    const strList = srData.list.map(
      sr =>
        `${sr.address} "${formatOptStr(sr.name)}" ${formatOptStr(sr.url)} ${
          sr.voteCount
        } ${sr.brokerage} ${sr.isJobs}`
    );

    const metaData = [
      `nextVotingDate: ${srData.nextVotingDate}`,
      `totalVotes: ${srData.totalVotes}`
    ];

    return [headerList]
      .concat(strList)
      .concat(metaData)
      .join("\n");
  }
};

const tronSuperRepresentative = {
  args: [
    {
      name: "max",
      desc: "max number of super representatives to return",
      type: Number
    },
    {
      name: "format",
      desc: Object.keys(superRepresentativesFormatters).join(" | "),
      type: String
    }
  ],
  job: ({
    max,
    format
  }: $Shape<{
    max: ?number,
    format: string
  }>): Observable<string> =>
    from(getTronSuperRepresentativeData(max)).pipe(
      map((srData: SuperRepresentativeData) => {
        const f =
          superRepresentativesFormatters[format] ||
          superRepresentativesFormatters.default;
        return f(srData);
      })
    )
};

export default {
  options,
  inferAccounts,
  inferTransactions,
  commands: {
    tronSuperRepresentative
  }
};
