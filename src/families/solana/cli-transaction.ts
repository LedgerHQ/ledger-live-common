import { findTokenById, findTokenByTicker } from "@ledgerhq/cryptoassets";
import invariant from "invariant";
import { getAccountCurrency } from "../../account";
import type {
  Transaction,
  AccountLike,
  Account,
  AccountLikeArray,
} from "../../types";
import { Transaction as SolanaTransaction } from "./types";
import { assertUnreachable } from "./utils";

const modes = ["send", "create-assoc-acc"] as const;
type Mode = typeof modes[number];

// options already specified in other blockchains like ethereum.
// trying to reuse existing ones like <token>, <mode>, etc.
const options = [];

function inferTransactions(
  transactions: Array<{
    account: AccountLike;
    mainAccount: Account;
    transaction: Transaction;
  }>,
  opts: Partial<Record<string, string>>
): Transaction[] {
  const mode = inferMode(opts.mode);

  // reusing ethereum token option, comes as array
  const tokens: string[] | undefined = opts.token as any;

  if (tokens !== undefined && tokens.length !== 1) {
    throw new Error("only 1 token at a time supported for solana transactions");
  }

  const token = tokens?.[0];

  return transactions.map(({ account, mainAccount, transaction }) => {
    if (transaction.family !== "solana") {
      throw new Error(
        `Solana family transaction expected, got <${transaction.family}>`
      );
    }
    switch (mode) {
      case "send":
        if (account.type === "Account") {
          const solanaTx: SolanaTransaction = {
            ...transaction,
            state: {
              kind: "unprepared",
              mode: {
                kind: "transfer",
                memo: opts.memo,
              },
            },
          };
          return solanaTx;
        } else {
          if (account.type !== "TokenAccount") {
            throw new Error("expected token account");
          }
          const solanaTx: SolanaTransaction = {
            ...transaction,
            subAccountId: account.id,
            state: {
              kind: "unprepared",
              mode: {
                kind: "token.transfer",
                subAccountId: account.id,
                memo: opts.memo,
              },
            },
          };
          return solanaTx;
        }
      case "create-assoc-acc":
        if (token === undefined) {
          throw new Error("token required");
        }

        if (account.type !== "Account") {
          throw new Error("expected main account");
        }

        const tokenCurrency = findTokenByTicker(token) ?? findTokenById(token);

        if (!tokenCurrency) {
          throw new Error(`token <${token}> not found`);
        }

        const solanaTx: SolanaTransaction = {
          ...transaction,
          state: {
            kind: "unprepared",
            mode: {
              kind: "token.createAssociatedTokenAccount",
              tokenId: tokenCurrency.id,
            },
          },
        };
        return solanaTx;
      default:
        return assertUnreachable(mode);
    }
  });
}

function inferAccounts(
  mainAccount: Account,
  opts: Record<string, string>
): AccountLikeArray {
  invariant(mainAccount.currency.family === "solana", "solana family currency");

  const mode = inferMode(opts.mode);

  switch (mode) {
    case "send":
      if (!opts.token) {
        return [mainAccount];
      }

      // reusing ethereum token option, comes as array
      const tokens: string[] = opts.token as any;

      if (tokens.length !== 1) {
        throw new Error("only 1 token at a time supported for solana");
      }

      const token = tokens[0].toLowerCase();

      const subAccount = mainAccount.subAccounts?.find((subAcc) => {
        const currency = getAccountCurrency(subAcc);
        return token === currency.ticker.toLowerCase() || token === currency.id;
      });

      if (subAccount === undefined) {
        throw new Error(
          "token account '" +
            opts.token +
            "' not found. Available: " +
            mainAccount.subAccounts
              ?.map((subAcc) => getAccountCurrency(subAcc).ticker)
              .join(", ")
        );
      }
      return [subAccount];
    case "create-assoc-acc":
      return [mainAccount];
    default:
      return assertUnreachable(mode);
  }
}

function inferMode(input?: string): Mode {
  const mode: Mode | undefined = input
    ? modes.some((m) => m === input)
      ? (input as Mode)
      : undefined
    : "send";

  if (mode === undefined) {
    throw new Error(
      `Unexpected mode <${mode}>. Supported modes: ${modes.join(", ")}`
    );
  }

  return mode;
}

export default {
  options,
  inferAccounts,
  inferTransactions,
};
