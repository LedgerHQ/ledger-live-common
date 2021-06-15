import { IStorage } from "./storage/types";
import { IClient as BlockchainIClient } from "../blockchain/client";
import events from "events";

declare interface IClient {
  on(event: "syncing", listener: () => void): this;
  on(event: "synced", listener: () => void): this;
}

class Client extends events.EventEmitter implements IClient {
  storage: IStorage;
  blockchainClient: BlockchainIClient;
  hwAppBTCClient: any;

  constructor({ storage, client, hwAppBTCClient }) {
    super();
    this.storage = storage;
    this.blockchainClient = client;
    this.hwAppBTCClient = hwAppBTCClient;

    // eventually listen to blockchainClient events
  }

  // implements ledger live specific functions by leveraging
  // this.blockchainClient and this.hwAppBTCClient
  // can also use its own storage

  // ....
}

export default Client;
