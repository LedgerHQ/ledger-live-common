import { IStorage, TX } from "./types";
import { findLast, filter, uniq, orderBy, uniqBy } from "lodash";
import fs from "fs";

// a mock storage class that just use js objects
class Mock implements IStorage {
  txs: TX[] = [];
  primaryIndex: {[string]: TX} = {};

  async getLastTx(txFilter) {
    return findLast(this.txs, txFilter);
  }

  async appendTxs(txs: TX[]) {
    const lastLength = this.txs.length;

    txs.forEach((tx) => {
      const index = `${tx.derivationMode}-${tx.account}-${tx.index}-${tx.id}`;
      if (this.primaryIndex[index]) {
        return;
      }
      this.primaryIndex[index] = tx;
      this.txs.push(tx);
    });

    return this.txs.length - lastLength;
  }

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

  async getDerivationModeUniqueAccounts(derivationMode: string) {
    return uniq(filter(this.txs, { derivationMode }).map((tx) => tx.account));
  }

  async toString(sort = (txs) => txs) {
    return JSON.stringify(sort(this.txs), null, 2);
  }
  async load(file: string) {
    //
    const txs = JSON.parse(fs.readFileSync(file).toString());
    await this.appendTxs(txs);
  }
}

export default Mock;
