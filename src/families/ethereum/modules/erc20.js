// @flow
// handle erc20 feature others than send.

import type { ModeModule } from "../types";

export type Modes = "erc20.approve";

/*
const erc20approve: ModeModule = {
};
*/

export const modes: { [_: Modes]: ModeModule } = {
  // "erc20.approve": erc20approve,
};
