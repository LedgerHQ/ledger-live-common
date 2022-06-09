import type { Account, SubAccount, TokenAccount } from "../../types";
import { log } from "@ledgerhq/logs";

export function reconciliateSubAccounts(
  tokenAccounts: TokenAccount[],
  initialAccount: Account | undefined
) {
  let subAccounts;

  if (initialAccount) {
    const initialSubAccounts: SubAccount[] | undefined =
      initialAccount.subAccounts;
    let anySubAccountHaveChanged = false;
    const stats: string[] = [];

    if (
      initialSubAccounts &&
      tokenAccounts.length !== initialSubAccounts.length
    ) {
      stats.push("length differ");
      anySubAccountHaveChanged = true;
    }

    subAccounts = tokenAccounts.map((ta: TokenAccount) => {
      const existingTokenAccount = initialSubAccounts?.find(
        (a) => a.id === ta.id
      );

      if (existingTokenAccount) {
        let sameProperties = true;

        if (existingTokenAccount !== ta) {
          for (const property in existingTokenAccount) {
            if (existingTokenAccount[property] !== ta[property]) {
              sameProperties = false;
              stats.push(`field ${property} changed for ${ta.id}`);
              break;
            }
          }
        }

        if (sameProperties) {
          return existingTokenAccount;
        } else {
          anySubAccountHaveChanged = true;
        }
      } else {
        anySubAccountHaveChanged = true;
        stats.push(`new token account ${ta.id}`);
      }

      return ta;
    });

    if (!anySubAccountHaveChanged && initialSubAccounts) {
      log(
        "elrond",
        "incremental sync: " +
          String(initialSubAccounts.length) +
          " sub accounts have not changed"
      );
      subAccounts = initialSubAccounts;
    } else {
      log(
        "elrond",
        "incremental sync: sub accounts changed: " + stats.join(", ")
      );
    }
  } else {
    subAccounts = tokenAccounts.map((a: TokenAccount) => a);
  }

  return subAccounts;
}
