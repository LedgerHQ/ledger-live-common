// @flow

/*
import { from } from "rxjs";
import { mergeAll } from "rxjs/operators";
import { flatMap } from "lodash";
*/
import { setup } from "./test-helpers/libcore-setup";
import { withLibcore, afterLibcoreGC } from "../libcore/access";
import { delay } from "../promise";

setup("libcore");

test("libcore version", async () => {
  const v = await withLibcore(core => core.LedgerCore.getStringVersion());
  expect(typeof v).toBe("string");
  // eslint-disable-next-line no-console
  console.log("libcore version " + v);
});

describe("libcore access", () => {
  test("withLibcore", async () => {
    const res = await withLibcore(async core => {
      expect(core).toBeDefined();
      await delay(100);
      return 42;
    });
    expect(res).toBe(42);
  });

  test("afterLibcoreGC", async () => {
    let count = 0;
    let gcjob = 0;

    withLibcore(async () => {
      await delay(100);
      ++count;
    });

    withLibcore(async () => {
      await delay(100);
      ++count;
    });

    let p3;

    await delay(20);

    await afterLibcoreGC(async () => {
      expect(count).toBe(2);
      await delay(100);
      p3 = withLibcore(async () => {
        await delay(400);
        ++count;
      });
      expect(count).toBe(2);
      await delay(100);
      expect(count).toBe(2);
      gcjob++;
    });

    await p3;

    expect(count).toBe(3);
    expect(gcjob).toBe(1);
  });
});
