import { from, interval, Observable } from "rxjs";
import { withDevice } from "@ledgerhq/live-common/lib/hw/deviceAccess";
import { concatMap, tap } from "rxjs/operators";
import getVersion from "@ledgerhq/live-common/lib/hw/getVersion";
import getOnboardingStatus from "@ledgerhq/live-common/lib/hw/getOnboardingStatus";

export default {
  description:
    "track the onboarding status of your nano",
  args: [
    {
      name: "refresh",
      alias: "r",
      desc: "refresh rate in milliseconds",
    },
  ],
  job: ({
    device,
  }: Partial<{
    device: string;
  }>) => interval(1000).pipe(
      concatMap(() => withDevice(device || "")((t) => from(getVersion(t)))),
      // pairwise()
      tap( ({flags}) => {
        const onboarding = getOnboardingStatus(flags);
        if(!onboarding){
          return
        }

        let sentence;
        if(onboarding.isOnboarded){
          sentence = "ONBOARDED";
        }
        else {
          if(onboarding.isRecoveryMode){
            sentence = "IN RECOVERY MODE";
          }
          else {
            if(onboarding.isSeedRecovery){
              sentence = "SEED RECOVERY";
            }
            // New seed
            else {
              sentence = "NEW SEED";
              if(onboarding.isConfirming){
                sentence += " - CONFIRMING";
              }
              // writing
              else {
                sentence += " - WRITING";
              }
            }
            sentence += ` : ${onboarding.currentWord} / ${onboarding.seedSize}`;
          }
        }

        console.log(`---------------------
    ${sentence}
---------------------`);
      })
    )
};