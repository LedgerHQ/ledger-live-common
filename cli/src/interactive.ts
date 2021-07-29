/* eslint-disable no-console */
import { deserializeError } from "@ledgerhq/errors";
import { from } from "rxjs";
import repl from "repl";
import commandLineArgs from "command-line-args";
// @ts-ignore
import { closeAllDevices } from "./live-common-setup";
// @ts-ignore
import commandsMain from "./commands-index";
// @ts-ignore
import perFamily from "@ledgerhq/live-common/lib/generated/cli-transaction";
import type { Account } from "@ledgerhq/live-common/lib/types";

export const commands = {
  ...Object.values(perFamily)
    // @ts-ignore
    .map((m) => typeof m === "object" && m && m.commands)
    .reduce((acc, c) => ({ ...acc, ...c }), {}),
  ...commandsMain,
};

export type LedgerState = {
  accounts: Account[];
};

export type StateUpdater =
  | Partial<LedgerState>
  | ((o: LedgerState) => Partial<LedgerState>);

export function interactive() {
  // CONTEXT IS THE REPL STATE
  // add what you need to "accumulate things"
  const state: LedgerState = {
    accounts: [],
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
    from(cmd.job(options, state, setState)).subscribe({
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
