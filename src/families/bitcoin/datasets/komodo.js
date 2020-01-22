
// @flow
import type { CurrenciesData } from "../../../__tests__/test-helpers/bridge";
import type { Transaction } from "../types";

const dataset: CurrenciesData<Transaction> = {
  scanAccounts: [
    {
      name: "komodo seed 1",
      apdus: `
      => e040000009028000002c8000008d
      <= 4104f03ba87f4ce992c7709442a2659cbf7cf492eae03b31c020c1ea865fb230982747a837566bd0044fe81a5d86bde329c26b9c226563da8e16d04df5c32c39790922524a4c6151464c4a793264766138314e79365a6b50686f375162434a4c6746394a70bddde0a2baa1f15b2a54be2ed6da29cf544131e48077fe47a6f1825db713c8c59000
      => e016000000
      <= 003c005501064b6f6d6f646f034b4d449000
      => e040000009028000002c8000008d
      <= 4104f03ba87f4ce992c7709442a2659cbf7cf492eae03b31c020c1ea865fb230982747a837566bd0044fe81a5d86bde329c26b9c226563da8e16d04df5c32c39790922524a4c6151464c4a793264766138314e79365a6b50686f375162434a4c6746394a70bddde0a2baa1f15b2a54be2ed6da29cf544131e48077fe47a6f1825db713c8c59000
      => e04000000d038000002c8000008d80000000
      <= 4104f02ac8add1eb928d983bdbe3837b03978813d8512e50a75240583b6fc5559d235142e50727d68e101a41baf94481a863bf1b2658bcce2b8b1e82b03f4646e1ad2252587272394a4b7533556e684651457772614a687454686732776e684a7546713146f86e40b677cf75cdc6af8c7b68df8a57e4da8bef2cb273240c703fb951d0a8219000
      => e04000000d038000002c8000008d80000001
      <= 410461a7c9df0aac98b7aefacea2a95bb9e2a299a08a274072d9485612515a6f7d6517dba858a9c580f636f5cbee2effbe697edd07829bcf85781b33429852db95f92252574d4342454d6878616f6148704b5a3264536f62686f6634426331527253756437471a4c638b946515a834e8ce7c79772b7a6189d40ea699afe86d4e62e73ce1259000
      => e04000000d038000002c8000008d80000002
      <= 41041c504934af344c38162b705f3a9eb3a52eaeeeb5b7cb3b7354bc0d92ab5b0475fa2b6cdb8f90345049467c8030b4ec61bb5a61b915b78539684b800ce0e96fbc22524e624162456b3742534a54636e3453416d767032355852737a69757757426d7331b598a406726c46b8b0737ad1f7162734c6e575f92939ab17fcec62c988c164b39000
      => e04000000d038000002c8000008d80000003
      <= 41042d55f5337af2320a9f04e4313966b4420b2808fca5a8a54ef5a7bcc0d62b131e0e099f110adfdbe4a85f94e3b93dc8e0c51df492db2ad0a5d1b8c383a6c4259a225244455648544d44676e31736e5551615376346f635174626a574a4768616974787af1078b6f1a41c0d8e671e97a19b05158d5da36ad34c644745fdd4fec9ae55ce59000
      `
    }
  ]
};

export default dataset;

