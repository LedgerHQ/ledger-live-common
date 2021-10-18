/* eslint-disable no-console */
import "./setup";
import implementLibcore from "../../libcore/platforms/nodejs";
let setupCalled = null;
export const setup = (testId) => {
  if (setupCalled) {
    throw new Error(
      "setup(" + testId + "): was already called with " + setupCalled
    );
  }

  setupCalled = testId;
  implementLibcore({
    lib: () => require("@ledgerhq/ledger-core"),
    // eslint-disable-line global-require
    dbPath: "./libcoredb/" + testId,
  });
};
