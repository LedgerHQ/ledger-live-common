import { Config, getChainAPI } from "../api/web4";
import { makeBridges } from "./bridge";

const mockChainAPI = (config: Config) => Promise.resolve(getChainAPI(config));

export default makeBridges(mockChainAPI);
