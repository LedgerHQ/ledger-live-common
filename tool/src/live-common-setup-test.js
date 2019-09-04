// @flow

export * from "./live-common-setup-without-libcore";
import axios from "axios";
import implementLibcore from "@ledgerhq/live-common/lib/libcore/platforms/nodejs";

export default (testId: string) => {
  implementLibcore({
    lib: () => require("@ledgerhq/ledger-core"), // eslint-disable-line global-require
    dbPath: "./libcoredb/" + testId
  });

  axios.interceptors.response.use(
    r => r,
    error => {
      console.warn("http error", error.response.status, error.request.path);
      return Promise.reject(error);
    }
  );

  jest.setTimeout(120000);
};
