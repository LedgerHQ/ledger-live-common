/* eslint-disable no-console */
import { listen } from "@ledgerhq/logs";
import "./setup";
import "./implement-react-native-libcore";
export const setup = (testName) => {
  global._JEST_SETUP(testName);
};
// eslint-disable-next-line no-unused-vars
listen(({ type, message }) => {
  console.log(type + (message ? ": " + message : ""));
});
