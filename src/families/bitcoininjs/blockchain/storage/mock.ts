import { IStorage } from "./types";

// a mock storage class that just use js objects
class Mock implements IStorage {
  async dump(file: string) {
    //
  }
  async load(file: string) {
    //
  }
}

export default Mock;
