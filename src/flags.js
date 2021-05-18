// @flow
import * as flags from "./data/flags";

type Icon = React$ComponentType<{}>;

export function getFlag(countryCode: string): ?Icon {
  return flags[countryCode];
}
