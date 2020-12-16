// @flow

import type { Account } from "../../../types";
import {roundValue} from "./heuristics/roundValue";

export function generateSecurityAudit(account: Account) {

  const res = account.operations.map((op) => roundValue(op))

  return {

  };
}
