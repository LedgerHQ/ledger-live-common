// @flow
import type { AvailableProvider } from "./types";
import providerPriorityMap from "./providersPriority";

/*
  By proxying this map, we can return a default value if
  the key doesn't exist . That's particularly useful in our
  case as we only want to assign a weight to specific 
  proprieties from an unknown and unterminated list of.
 */
const providersWeights = new Proxy(
  {},
  {
    get: (_, propriety) =>
      Object.prototype.hasOwnProperty.call(providerPriorityMap, propriety)
        ? providerPriorityMap[propriety]
        : 0,
  }
);

const sortProvidersByWeight = (
  provA: AvailableProvider,
  provB: AvailableProvider
) => (providersWeights[provA.provider] - providersWeights[provB.provider]) * -1;

export default sortProvidersByWeight;
