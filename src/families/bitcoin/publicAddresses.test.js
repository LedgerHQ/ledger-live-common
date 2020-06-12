// @flow

import { getAbandonSeedAddress } from "../../data/abandonseed";
import { listCryptoCurrencies } from "../../currencies";

const ignore = ["bitcloud", "bitcore", "bitsend", "megacoin"];

test("wadus", () => {
  const currenciyIds = listCryptoCurrencies(true)
    .filter(
      (c) =>
        c.family === "bitcoin" && c.managerAppName && !ignore.includes(c.id)
    )
    .map((c) => c.id)
    .sort();
  expect(
    currenciyIds.every((id) => getAbandonSeedAddress(id) !== undefined)
  ).toEqual(true);
});
