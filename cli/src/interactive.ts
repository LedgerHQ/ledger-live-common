/* eslint-disable no-console */
import { deserializeError, InvalidAddressBecauseDestinationIsAlsoSource } from "@ledgerhq/errors";
import { from, Observable, of } from "rxjs";
import { first } from "rxjs/operators";
import repl from "repl";
import commandLineArgs from "command-line-args";
import { closeAllDevices } from "./live-common-setup";
import commandsMain from "./commands-index";
import perFamily from "@ledgerhq/live-common/lib/generated/cli-transaction";
import type { Account } from "@ledgerhq/live-common/lib/types";
import {scan, ScanCommonOpts} from "./scan"

export const commands = {
  ...Object.values(perFamily)
    // @ts-expect-error command stuff
    .map((m) => typeof m === "object" && m && m.commands)
    .reduce((acc, c) => ({ ...acc, ...c }), {}),
  ...commandsMain,
};

export type LedgerState = {
  accounts: Account[];
  selectedAccount: Account | null;
};

export type StateUpdater =
  | Partial<LedgerState>
  | ((o: LedgerState) => Partial<LedgerState>);

export function interactive() {
  // CONTEXT IS THE REPL STATE
  // add what you need to "accumulate things"
  const state: LedgerState = {
    accounts: [],
    selectedAccount: null,
  };

  const setState = function (ctx: StateUpdater) {
    Object.assign(state, typeof ctx === "function" ? ctx(state) : ctx);
  };

  const evaluate = function (line, _context, _filename, callback) {
    const [command, ...argv] = line.split(/\s+/).filter(Boolean);
    if (!command) {
      callback();
      return;
    }
    const cmd = commands[command];
    if (!cmd) {
      console.error("Command not found: " + command);
      callback();
      return;
    }
    const options = commandLineArgs(cmd.args, {
      argv,
      stopAtFirstUnknown: true,
    });
    from(cmd.job(options, state, setState) || []).subscribe({
      next: (log) => {
        if (log !== undefined) console.log(log);
      },
      error: (error) => {
        const e = error instanceof Error ? error : deserializeError(error);
        console.error(e);
        callback();
      },
      complete: () => {
        callback();
      },
    });
  };
  repl
    .start({
      prompt: "ledger> ",
      input: process.stdin,
      output: process.stdout,
      eval: evaluate,
    })
    .on("exit", function () {
      closeAllDevices();
    });
}


export const requireAccount = function (opts: ScanCommonOpts, state: LedgerState | undefined): Observable<Account> {
  if (!state) {
    return scan(opts).pipe(first());
  }
  let account = state.selectedAccount;
  account = state.accounts[0]; // first hack
  if (!account) throw new Error("please 'selectAccount' first");
  return of(account);
}

export const requireAccounts = function (opts: ScanCommonOpts, state: LedgerState | undefined): Observable<Account> {
  return !state ? scan(opts) : from(state.accounts);
}