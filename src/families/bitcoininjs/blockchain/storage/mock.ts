import { Input, IStorage, Output, TX } from "./types";
import { findLast, filter, uniqBy, findIndex } from "lodash";
import fs from "fs";

// a mock storage class that just use js objects
// sql.js would be perfect for the job
class Mock implements IStorage {
  txs: TX[] = [];
  // indexes
  primaryIndex: { [string]: TX } = {};
  // accounting
  unspentUtxos: { [string]: Output[] } = {};
  // only needed to handle the case when the input
  // is seen before the output (typically explorer
  // returning unordered tx within the same block)
  spentUtxos: { [string]: Input[] } = {};

  async getLastTx(txFilter) {
    return findLast(this.txs, txFilter);
  }

  // TODO: only expose unspentUtxos
  async getAddressUnspentUtxos(address: Address) {
    const indexAddress = address.address;
    return this.unspentUtxos[indexAddress];
  }

  async appendTxs(txs: TX[]) {
    const lastLength = this.txs.length;

    txs.forEach((tx) => {
      const indexAddress = tx.address;
      const index = `${indexAddress}-${tx.id}`;

      if (this.primaryIndex[index]) {
        return;
      }

      this.primaryIndex[index] = tx;
      this.unspentUtxos[indexAddress] = this.unspentUtxos[indexAddress] || [];
      this.spentUtxos[indexAddress] = this.spentUtxos[indexAddress] || [];
      this.txs.push(tx);

      tx.outputs.forEach((output) => {
        if (output.address === tx.address) {
          this.unspentUtxos[indexAddress].push(output);
        }
      });

      tx.inputs.forEach((input) => {
        if (input.address === tx.address) {
          this.spentUtxos[indexAddress].push(input);
        }
      });

      this.unspentUtxos[indexAddress] = this.unspentUtxos[indexAddress].filter(
        (output) => {
          const matchIndex = findIndex(
            this.spentUtxos[indexAddress],
            (input: Input) =>
              input.output_hash === output.output_hash &&
              input.output_index === output.output_index
          );
          if (matchIndex > -1) {
            this.spentUtxos[indexAddress].splice(matchIndex, 1);
            return false;
          }
          return true;
        }
      );
    });

    return this.txs.length - lastLength;
  }

  async getUniquesAddresses(addressesFilter) {
    // TODO: to speed up, create more useful indexes in appendTxs
    return uniqBy(
      filter(this.txs, addressesFilter).map((tx) => ({
        address: tx.address,
        account: tx.account,
        index: tx.index,
      })),
      "address"
    );
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
