import Storage from "../storage/mock";
import Explorer from "../explorer/ledger.v3.2.4";
import Derivation from "../derivation/bitcoin";
import Client from "../client";
import path from "path";
import fs from "fs";
import coininfo from "coininfo";
import { toMatchFile } from "jest-file-snapshot";

expect.extend({ toMatchFile });

describe("bitcoin sync xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz", () => {
  let storage = new Storage();
  let explorer = new Explorer({
    explorerURI: "https://explorers.api.vault.ledger.com",
  });
  let derivation = new Derivation({
    network: coininfo.bitcoin.main.toBitcoinJS(),
  });
  let xpub =
    "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz";
  let client = new Client({
    storage,
    explorer,
    derivation,
    xpub,
  });

  it("should sync from zero correctly", async () => {
    await client.sync();

    const tempDump = path.join(__dirname, "data", "temp", `${xpub}.json`);
    const truthDump = path.join(__dirname, "data", "sync", `${xpub}.json`);
    await storage.dump(tempDump);

    expect(fs.readFileSync(tempDump)).toMatchFile(truthDump);
  });
});
