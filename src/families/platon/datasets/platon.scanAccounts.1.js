// @flow
import type { CurrenciesData } from "../../../types";
import type { Transaction } from "../types";

const dataset: CurrenciesData<Transaction> = {
  scanAccounts: [
    {
      name: "Platon seed 1",
      apdus: `
      => e002000009028000002c800001e6
      <= 41048d65d4d7803363822c57d048fcf66c6e28e9892813527490cbc7edb3ba1b2e9731d8c9152e36ce92175d3da0611a5147aa9ddeba396827c371f7cc1324c276eb2a6c61743170676e6c3370746667363637336b763534336d6664753534396e6433743865736a383638307a9000
      => e002000015058000002c800001e6800000000000000000000000
      <= 41040e7425e1f3ac47253868f89ff49bdfcb9c8471e61c9708c4c5ee1416ca6335e03e9436b2e43656ce2b6b89ff33032981e23858d8a97a7b7122300e49f8ec73c92a6c61743132323465616c72617263397565386b6863346e34726d6337666b72647176686c32723378706b9000
      => e002000015058000002c800001e6800000010000000000000000
      <= 4104766759cb10865f8d6dadd2da2e9b4f6d15a867fb236ee5e700ca0416243f9b37ed059ae279116e909e9c648efbd0f6d4281fad9446381c4520208e57845d0acd2a6c61743136676777796d366a77327737617074786d783866667768366b756d6c7a363038707430786e389000
      => e002000015058000002c800001e6800000020000000000000000
      <= 410429f67fc68fff57bd2219603b8352816cb71ce71a97613d2196f8d8a4c7d342178d3cab45714e09fd9d6c8162fb2558da8b9995f6545cb41de0665e67802c00b92a6c617431636b34667a6771326d793568646d70617264677877643636686e7837776d39727032336d38309000
      `
    }
  ]
};

export default dataset;