import { BigNumber } from "bignumber.js";
import {
    NotEnoughBalance,
    FeeNotLoaded,
    InvalidAddress,
    InvalidAddressBecauseDestinationIsAlsoSource,
    NotEnoughBalanceBecauseDestinationNotCreated,
    RecipientRequired,
    AmountRequired,
} from "@ledgerhq/errors";
import type { Account } from "../../types";
import type { Transaction } from "./types";
import { checkRecipientExist, isAddressValid } from "./logic";

const getTransactionStatus = async (
    a: Account,
    t: Transaction
): Promise<{
    errors: Record<string, Error>;
    warnings: Record<string, Error>;
    estimatedFees: BigNumber;
    amount: BigNumber;
    totalSpent: BigNumber;
}> => {
    const errors: Record<string, Error> = {};
    const warnings: Record<string, Error> = {};
    const useAllAmount = !!t.useAllAmount;

    console.log("account balance", a.balance.toNumber());
    console.log("use all amount?", useAllAmount);
    console.log("want to spend", t.amount.toNumber());

    console.log("network info", t.networkInfo);

    /* TODO: check if we need that
    if (a.pendingOperations.length > 0) {
        throw new AccountAwaitingSendPendingOperations();
    }
    */

    if (!t.recipient) {
        errors.recipient = new RecipientRequired();
    } else if (a.freshAddress === t.recipient) {
        errors.recipient = new InvalidAddressBecauseDestinationIsAlsoSource();
    } else if (!isAddressValid(t.recipient)) {
        errors.recipient = new InvalidAddress();
    }

    if (!t.networkInfo) {
        errors.fees = new FeeNotLoaded();
    }

    /*
     * TODO: check if acc is multi sign
     */

    const estimatedFees =
        t.networkInfo?.lamportsPerSignature || new BigNumber(0);

    console.log("estimated fees is: ", estimatedFees);

    const totalSpent = useAllAmount
        ? a.balance
        : new BigNumber(t.amount).plus(estimatedFees);

    console.log("total spent", totalSpent.toNumber());

    const amount = totalSpent.minus(estimatedFees);

    console.log("amount is ", amount);

    if (amount.lte(0)) {
        errors.emount = new AmountRequired();
    }

    if (totalSpent.gt(a.balance)) {
        errors.amount = new NotEnoughBalance();
    }

    if (!(await checkRecipientExist(t.recipient))) {
        errors.amount = new NotEnoughBalanceBecauseDestinationNotCreated();
    }

    return {
        errors,
        warnings,
        estimatedFees,
        amount,
        totalSpent,
    };
};

export default getTransactionStatus;
