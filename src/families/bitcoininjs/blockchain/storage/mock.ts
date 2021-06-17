import { IStorage, TX } from "./types";
import { findLast, filter, uniq, flatten, find, sortedIndexBy } from "lodash";
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

  async getAddressDetails(address) {
    // todo perfs: take advantage of the ordered txs
    const oneTx = await find(this.txs, { address });

    if (oneTx) {
      return {
        derivationMode: oneTx.derivationMode,
        account: oneTx.account,
        index: oneTx.index,
      };
    }

    throw "Address unknown";
  }

  // todo perfs: take advantage of the ordered txs
  async getUniquesAddresses(addressesFilter) {
    return uniq(filter(this.txs, addressesFilter).map((tx) => tx.address));
  }

  async getUniquesAddresssesMap(addressesFilter) {
    return (await this.getUniquesAddresses(addressesFilter)).reduce(
      (map, address) => {
        map[address] = true;
        return map;
      },
      {}
    );
  }

  async getDerivationModeUniqueAccounts(derivationMode: string) {
    return uniq(filter(this.txs, { derivationMode }).map((tx) => tx.account));
  }

  async getOutputsToInternalWalletAddresses(outputsFilter) {
    const ownAddresses = await this.getUniquesAddresssesMap({});

    return filter(
      flatten(filter(this.txs, outputsFilter).map((tx) => tx.outputs)),
      (output) => !!ownAddresses[output.address]
    );
  }

  async getInputsFromInternalWalletAddresses(inputsFilter) {
    const ownAddresses = await this.getUniquesAddresssesMap({});

    return filter(
      flatten(filter(this.txs, inputsFilter).map((tx) => tx.inputs)),
      (input) => !!ownAddresses[input.address]
    );
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
