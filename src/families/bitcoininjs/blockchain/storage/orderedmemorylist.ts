import { IStorage, TX } from "./types";
import { findLast, filter, uniq, sortedIndexBy, uniqBy } from "lodash";
import fs from "fs";

// a mock storage class that just use js objects
class Mock implements IStorage {
  txs: TX[] = [];

  // TODO perfs: take advantag of the ordered txs using sortedIndexBy/sortedLastIndexBy
  async getLastTx(txFilter) {
    return findLast(this.txs, txFilter);
  }

  // insert in the ordered list
  async appendAddressTxs(txs: TX[]) {
    if (!txs.length) {
      return;
    }
    const sorting = ["derivationMode", "account", "index", "block.height"];
    // sortIndexBy does not support multiple column sorting
    const insertIndex = sorting.reduce(
      (acc, column) => {
        const firstColumnIndex = sortedIndexBy(acc.txsSlice, txs[0], column);
        return {
          txsSlice: acc.txsSlice.slice(firstColumnIndex),
          insertIndex: acc.insertIndex + firstColumnIndex,
        };
      },
      { txsSlice: this.txs, insertIndex: 0 }
    ).insertIndex;
    this.txs.splice(insertIndex, 0, ...txs);
  }

  // todo perfs: take advantage of the ordered txs
  async getUniquesAddresses(addressesFilter) {
    return uniqBy(
      filter(this.txs, addressesFilter).map((tx) => ({
        address: tx.address,
        derivationMode: tx.derivationMode,
        account: tx.account,
        index: tx.index,
      })),
      "address"
    );
  }

  // todo perfs: take advantage of the ordered txs
  async getDerivationModeUniqueAccounts(derivationMode: string) {
    return uniq(filter(this.txs, { derivationMode }).map((tx) => tx.account));
  }

  async toString() {
    return JSON.stringify(this.txs, null, 2);
  }
  async load(file: string) {
    //
    this.txs = JSON.parse(fs.readFileSync(file).toString());
  }
}

export default Mock;
