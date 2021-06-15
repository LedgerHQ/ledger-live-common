import { IExplorer } from "./types";

// an Live explorer V3 class
class LedgerV3Dot2Dot4 implements IExplorer {
  explorerURI: string;
  syncAddressesParallelAddresses: number = 5;
  syncAddressesParallelRequests: number = 5;
  syncAddressesBatchSize: number = 50;

  constructor({ explorerURI }) {
    this.explorerURI = explorerURI;
  }
}

export default LedgerV3Dot2Dot4;
