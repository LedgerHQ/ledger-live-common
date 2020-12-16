import type { OperationHeuristic } from "../types";
import type {Operation} from "../../../../types";

export const roundValue: OperationHeuristic = (op: Operation) => {
  console.log(op);
  return false;
}