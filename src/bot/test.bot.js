// @flow

import { setup } from "../__tests__/test-helpers/libcore-setup";
import { bot } from ".";

setup("bot");

jest.setTimeout(59 * 60 * 1000);

test("bot", async () => {
  await bot();
});
