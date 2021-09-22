import BigNumber from "bignumber.js";
import { flatten, sortBy } from "lodash";
import { NotEnoughBalance } from "@ledgerhq/errors";
import { Output } from "../storage/types";
import Xpub from "../xpub";
import { PickingStrategy } from "./types";
import * as utils from "../utils";
import { Merge } from "./Merge";

export class CoinSelect extends PickingStrategy {
  // eslint-disable-next-line class-methods-use-this
  async selectUnspentUtxosToUse(
    xpub: Xpub,
    amount: BigNumber,
    feePerByte: number,
    nbOutputsWithoutChange: number
  ) {
    // get the utxos to use as input
    // from all addresses of the account
    const addresses = await xpub.getXpubAddresses();

    const unspentUtxos = flatten(
      await Promise.all(
        addresses.map((address) => xpub.storage.getAddressUnspentUtxos(address))
      )
    ).filter(
      (o) =>
        !this.excludedUTXOs.filter(
          (x) => x.hash === o.output_hash && x.outputIndex === o.output_index
        ).length
    );

    /*
     * This coin selection is inspired from the one used in Bitcoin Core
     * for more details please refer to SelectCoinsBnB
     * https://github.com/bitcoin/bitcoin/blob/0c5f67b8e5d9a502c6d321c5e0696bc3e9b4690d/src/wallet/coinselection.cpp
     * A coin selection is considered valid if its total value is within the range : [targetAmount, targetAmount + costOfChange]
     */
    // refer to https://github.com/LedgerHQ/lib-ledger-core/blob/master/core/src/wallet/bitcoin/transaction_builders/BitcoinLikeStrategyUtxoPicker.cpp#L168
    const TOTAL_TRIES = 100000;
    const longTermFees = 20;

    // Compute cost of change
    const fixedSize = utils.estimateTxSize(
      0,
      0,
      this.crypto,
      this.derivationMode
    );
    // Size of only 1 output (without fixed size)
    const oneOutputSize =
      utils.estimateTxSize(0, 1, this.crypto, this.derivationMode) - fixedSize;
    // Size 1 signed UTXO (signed input)
    const signedUTXOSize =
      utils.estimateTxSize(1, 0, this.crypto, this.derivationMode) - fixedSize;

    // Size of unsigned change
    const changeSize = oneOutputSize;
    // Size of signed change
    const signedChangeSize = signedUTXOSize;

    const effectiveFees = feePerByte;
    // Here signedChangeSize should be multiplied by discard fees
    // but since we don't have access to estimateSmartFees, we assume
    // that discard fees are equal to effectiveFees
    const costOfChange = effectiveFees * (signedChangeSize + changeSize);

    // Calculate effective value of outputs
    let currentAvailableValue = 0;
    let effectiveUtxos: Array<{
      index: number;
      effectiveFees: number;
      longTermFees: number;
      effectiveValue: number;
    }> = [];

    for (let i = 0; i < unspentUtxos.length; i += 1) {
      const outEffectiveValue =
        Number(unspentUtxos[i].value) - effectiveFees * signedUTXOSize;
      if (outEffectiveValue > 0) {
        const outEffectiveFees = effectiveFees * signedUTXOSize;
        const outLongTermFees = longTermFees * signedUTXOSize;
        const effectiveUtxo = {
          index: i,
          effectiveFees: outEffectiveFees,
          longTermFees: outLongTermFees,
          effectiveValue: outEffectiveValue,
        };
        effectiveUtxos.push(effectiveUtxo);
        currentAvailableValue += outEffectiveValue;
      }
    }

    // Get no inputs fees
    // At beginning, there are no outputs in tx, so noInputFees are fixed fees
    const notInputFees =
      effectiveFees * (fixedSize + oneOutputSize * nbOutputsWithoutChange); // at least fixed size and outputs(version...)

    // Start coin selection algorithm (according to SelectCoinBnb from Bitcoin Core)
    let currentValue = 0;
    // std::vector<bool> currentSelection;
    // currentSelection.reserve(utxos.size());
    const currentSelection: boolean[] = [];

    // Actual amount we are targetting
    const actualTarget = notInputFees + amount.toNumber();

    // Insufficient funds
    if (currentAvailableValue < actualTarget) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      throw new (NotEnoughBalance as any)();
    }
    // Sort utxos by effectiveValue
    effectiveUtxos = sortBy(effectiveUtxos, "effectiveValue");
    effectiveUtxos = effectiveUtxos.reverse();

    let currentWaste = 0;
    let bestWaste = Number.MAX_SAFE_INTEGER;
    let bestSelection: boolean[] = [];

    // Deep first search loop to choose UTXOs
    for (let i = 0; i < TOTAL_TRIES; i += 1) {
      // Condition for starting a backtrack
      let backtrack = false;
      if (
        currentValue + currentAvailableValue < actualTarget || // Cannot reach target with the amount remaining in currentAvailableValue
        currentValue > actualTarget + costOfChange || // Selected value is out of range, go back and try other branch
        (currentWaste > bestWaste &&
          effectiveUtxos[0].effectiveFees - effectiveUtxos[0].longTermFees > 0)
      ) {
        // avoid selecting utxos producing more waste
        backtrack = true;
      } else if (currentValue >= actualTarget) {
        // Selected valued is within range
        currentWaste += currentValue - actualTarget;
        if (currentWaste <= bestWaste) {
          bestSelection = currentSelection.slice();
          while (effectiveUtxos.length > bestSelection.length) {
            bestSelection.push(false);
          }
          bestSelection.length = effectiveUtxos.length;
          bestWaste = currentWaste;
        }
        // remove the excess value as we will be selecting different coins now
        currentWaste -= currentValue - actualTarget;
        backtrack = true;
      }
      // Move backwards
      if (backtrack) {
        // Walk backwards to find the last included UTXO that still needs to have its omission branch traversed.
        while (
          currentSelection.length > 0 &&
          !currentSelection[currentSelection.length - 1]
        ) {
          currentSelection.pop();
          currentAvailableValue +=
            effectiveUtxos[currentSelection.length].effectiveValue;
        }

        // Case we walked back to the first utxos and all solutions searched.
        if (currentSelection.length === 0) {
          break;
        }

        // Output was included on previous iterations, try excluding now
        currentSelection[currentSelection.length - 1] = false;
        const eu = effectiveUtxos[currentSelection.length - 1];
        currentValue -= eu.effectiveValue;
        currentWaste -= eu.effectiveFees - eu.longTermFees;
      } else {
        // Moving forwards, continuing down this branch
        const eu = effectiveUtxos[currentSelection.length];
        // Remove this utxos from currentAvailableValue
        currentAvailableValue -= eu.effectiveValue;

        // Avoid searching a branch if the previous UTXO has the same value and same waste and was excluded. Since the ratio of fee to
        // long term fee is the same, we only need to check if one of those values match in order to know that the waste is the same.
        if (
          currentSelection.length > 0 &&
          !currentSelection[currentSelection.length - 1] &&
          eu.effectiveValue ===
            effectiveUtxos[currentSelection.length - 1].effectiveValue &&
          eu.effectiveFees ===
            effectiveUtxos[currentSelection.length - 1].effectiveFees
        ) {
          currentSelection.push(false);
        } else {
          // Inclusion branch first
          currentSelection.push(true);
          currentValue += eu.effectiveValue;
          currentWaste += eu.effectiveFees - eu.longTermFees;
        }
      }
    }
    if (bestSelection.length > 0) {
      let total = new BigNumber(0);
      const unspentUtxoSelected: Output[] = [];
      for (let i = 0; i < bestSelection.length; i += 1) {
        if (bestSelection[i]) {
          unspentUtxoSelected.push(unspentUtxos[effectiveUtxos[i].index]);
          total = total.plus(unspentUtxos[effectiveUtxos[i].index].value);
        }
      }
      const fee = utils.estimateTxSize(
        unspentUtxoSelected.length,
        nbOutputsWithoutChange,
        this.crypto,
        this.derivationMode
      );
      return {
        totalValue: total,
        unspentUtxos: unspentUtxoSelected,
        fee: Math.ceil(fee),
        needChangeoutput: false,
      };
    }
    const pickingStrategy = new Merge(
      this.crypto,
      this.derivationMode,
      this.excludedUTXOs
    );
    return pickingStrategy.selectUnspentUtxosToUse(
      xpub,
      amount,
      feePerByte,
      nbOutputsWithoutChange
    );
  }
}
