import { IExplorer } from "./types";
import EventEmitter from "../utils/eventemitter";

// a mock explorer class that just use js objects
class Mock extends EventEmitter implements IExplorer {
  getNAddressTransactionsSinceBlockExcludingBlock() {
    return [];
  }
}

export default Mock;
