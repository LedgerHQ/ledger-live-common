import { IStorage } from "./storage/types";
import { IWallet } from "../blockchain/types";
import events from "events";

declare interface IClient {
  on(event: "syncing", listener: () => void): this;
  on(event: "synced", listener: () => void): this;
}

class Client extends events.EventEmitter implements IClient {
  storage: IStorage;
  wallet: IWallet;
  hwAppBTCClient: any;

  constructor({ storage, wallet, hwAppBTCClient }) {
    super();
    this.storage = storage;
    this.wallet = wallet;
    this.hwAppBTCClient = hwAppBTCClient;

    // eventually listen to this.wallet events
  }

  // implements ledger live specific functions by leveraging
  // this.wallet and this.hwAppBTCClient
  // can also use its own storage

  // ....
}

export default Client;
