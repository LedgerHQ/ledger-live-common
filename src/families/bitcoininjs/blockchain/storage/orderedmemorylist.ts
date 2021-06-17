import { IStorage, TX } from "./types";
import { findLast, filter, uniq, orderBy, uniqBy } from "lodash";
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
    // TODO: insert in the right place directly
    // this thing almost work correctly I think
    /*
    const sorting = ["derivationMode", "account", "index"];
    // sortIndexBy does not support multiple column sorting
    const { addressStartIndex, addressPreviousTxs } = sorting.reduce(
      (acc, sort) => {
        const firstColumnIndex = sortedIndexBy(
          acc.addressPreviousTxs,
          txs[0],
          sort
        );
        const lastColumnIndex = sortedLastIndexBy(
          acc.addressPreviousTxs,
          txs[0],
          sort
        );
        return {
          addressPreviousTxs: acc.addressPreviousTxs.slice(
            firstColumnIndex,
            lastColumnIndex
          ),
          addressStartIndex: acc.addressStartIndex + firstColumnIndex,
        };
      },
      { addressPreviousTxs: this.txs, addressStartIndex: 0 }
    );
    this.txs.splice(addressStartIndex + addressPreviousTxs.length, 0, ...txs);
    */

    this.txs.splice(this.txs.length, 0, ...txs);
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
    // TODO: no sorting if the list is already ordered
    // return JSON.stringify(this.txs, null, 2);

    return JSON.stringify(
      orderBy(this.txs, [
        "derivationMode",
        "account",
        "index",
        "block.height",
        "id",
      ]),
      null,
      2
    );
  }
  async load(file: string) {
    //
    this.txs = JSON.parse(fs.readFileSync(file).toString());
  }
}

export default Mock;
