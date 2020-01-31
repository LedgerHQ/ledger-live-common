// @flow

import { setup } from "../../__tests__/test-helpers/libcore-setup";
import { testBridge } from "../../__tests__/test-helpers/bridge";
import dataset from "./test-dataset";
import specifics from "./test-specifics";

setup("tezos");

testBridge("tezos", dataset);

specifics();
