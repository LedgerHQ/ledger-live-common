import { cached, Config, getChainAPI, queued } from "../api";
import { makeLRUCache } from "../../../cache";
import { makeBridges } from "./bridge";
import { minutes } from "../api/cached";

const getChainAPIQueuedAndCached = makeLRUCache(
  (config: Config) => Promise.resolve(cached(queued(getChainAPI(config), 100))),
  (config) => config.cluster,
  minutes(1000)
);

export default makeBridges(getChainAPIQueuedAndCached);
