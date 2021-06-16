import { IStorage, TX } from "./types";
import { findLast, sortBy, filter, uniq, flatten, find } from "lodash";
import fs from "fs";

// a mock storage class that just use js objects
class Mock implements IStorage {
  txs: TX[] = [];

  async getDerivationModeLastAccount(derivationMode: string) {
    return (findLast(this.txs, { derivationMode }) || {}).account;
  }

  async getAccountLastIndex(derivationMode: string, account: number) {
    return (findLast(this.txs, { derivationMode, account }) || {}).index;
  }

  async getAddressLastBlock(
    derivationMode: string,
    account: number,
    index: number
  ) {
    return (findLast(this.txs, { derivationMode, account, index }) || {}).block;
  }

  async appendAddressTxs(txs: TX[]) {
    this.txs = this.txs.concat(txs);
  }

  async getAddressDetails(address) {
    const oneTx = find(this.txs, { address });

    if (oneTx) {
      return {
        derivationMode: oneTx.derivationMode,
        account: oneTx.account,
        index: oneTx.index,
      };
    }

    throw "Address unknown";
  }

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
    return JSON.stringify(
      sortBy(this.txs, ["derivationMode", "account", "index", "block.height"]),
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
