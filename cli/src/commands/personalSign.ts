import { from } from "rxjs";
import { mergeMap } from "rxjs/operators";
import { asDerivationMode } from "@ledgerhq/live-common/lib/derivation";
import { withDevice } from "@ledgerhq/live-common/lib/hw/deviceAccess";
import signMessage from "@ledgerhq/live-common/lib/hw/signMessage";
import { inferCurrency } from "../scan";
export default {
  description:
    "Sign a message with the device on the ethereum app on specific derivations (advanced)",
  args: [
    {
      name: "path",
      type: String,
      desc: "HDD derivation path",
    },
    {
      name: "derivationMode",
      type: String,
      desc: "derivationMode to use",
    },
    {
      name: "message",
      type: String,
      desc: "the message to sign",
    },
  ],
  job: (arg: any) =>
    inferCurrency({
        ...arg,
        currency: "ethereum"
    }).pipe(
      mergeMap((currency) => {
        if (!arg.path) {
          throw new Error("--path is required");
        }

        // Used to verify that a valid derivation mode was specified
        asDerivationMode(arg.derivationMode);
        return withDevice(arg.device || "")((t) =>
          from(signMessage(t, { ...arg, currency }))
        );
      })
    ),
};
