import "../../__tests__/test-helpers/setup";
import { testBridgeWithoutLibcore } from "../../__tests__/test-helpers/bridge";
import dataset from "./test-dataset";

testBridgeWithoutLibcore("crypto_org", dataset);
