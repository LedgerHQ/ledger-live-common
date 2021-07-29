// @flow
import { from } from "rxjs"; // https://rxjs.dev/ is a stream library
import type { LedgerState, StateUpdater } from "../interactive";

type Opts = {}; // this allows to type the parameters you gets. but only optional.

// if you take parameters, you will use this to define what type they are.
// see other commands for samples
const args = [];

export default {
  description: "EXPLAIN THE COMMAND",
  args,
  // Job is a function that takes
  // - opts: parameters from commandline
  // - state: IF in repl mode, it is the accumulated state
  // - setState: IF in repl mode, it is the function to update that state (same style as setState in react)
  // and returns an Observable<*> where Observable is a concept from rxjs
  // there are many ways to create observable
  job: (opts: Opts, state: ?LedgerState, setState: ?(StateUpdater) => void) =>
    from(["hello", "world"]),
};
