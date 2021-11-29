import { Config, getChainAPI } from "../api/web4";
import { makeLRUCache } from "../../../cache";
import { minutes } from "../prepare-tx/prepare-tx-api-cached";
import { makeBridges } from "./bridge";

const getChainAPIQueuedAndCached = makeLRUCache(
  //TODO: make queued and cached
  (config: Config) => Promise.resolve(getChainAPI(config)),
  (config) => config.cluster,
  minutes(1000)
);

export default makeBridges(getChainAPIQueuedAndCached);
