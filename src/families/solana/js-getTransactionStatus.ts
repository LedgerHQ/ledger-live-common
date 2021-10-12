import { BigNumber } from "bignumber.js";
import {
    NotEnoughBalance,
    FeeNotLoaded,
    InvalidAddress,
    InvalidAddressBecauseDestinationIsAlsoSource,
    NotEnoughBalanceBecauseDestinationNotCreated,
    RecipientRequired,
    AmountRequired,
    FeeTooHigh,
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

    if (t.fees === undefined) {
        errors.fees = new FeeNotLoaded();
    }

    /*
     * TODO: check if acc is multi sign
     */

    const estimatedFees = t.fees || new BigNumber(0);

    const totalSpent = useAllAmount
        ? a.balance
        : new BigNumber(t.amount).plus(estimatedFees);

    const amount = totalSpent.minus(estimatedFees);

    if (amount.lte(0)) {
        errors.emount = new AmountRequired();
    }

    if (totalSpent.gt(a.balance)) {
        errors.amount = new NotEnoughBalance();
    }

    if (t.fees && t.fees.gte(amount.times(10))) {
        errors.fees = new FeeTooHigh();
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
