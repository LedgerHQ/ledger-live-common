import { BigNumber } from "bignumber.js";
import {
    AmountRequired,
    NotEnoughBalance,
    FeeNotLoaded,
    InvalidAddress,
    InvalidAddressBecauseDestinationIsAlsoSource,
    NotEnoughSpendableBalance,
    NotEnoughBalanceBecauseDestinationNotCreated,
    RecipientRequired,
} from "@ledgerhq/errors";
import {
    StellarWrongMemoFormat,
    SourceHasMultiSign,
    AccountAwaitingSendPendingOperations,
} from "../../errors";
import { formatCurrencyUnit } from "../../currencies";
import type { Account } from "../../types";
import type { Transaction } from "./types";
import { isAddressValid, checkRecipientExist } from "./logic";
import { checkOnChainAccountExists } from "./api/web3";

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

    /*
        * TODO: check if we need that
    if (a.pendingOperations.length > 0) {
        throw new AccountAwaitingSendPendingOperations();
    }
    */

    //TODO: check if ledger is checking that
    if (!t.recipient) {
        errors.recipient = new RecipientRequired("");
    } else if (a.freshAddress === t.recipient) {
        // TODO: what if I still want to ?
        errors.recipient = new InvalidAddressBecauseDestinationIsAlsoSource();
    } else if (!isAddressValid(t.recipient)) {
        errors.recipient = new InvalidAddress("");
    }

    /*
        * TODO: check multi sig
    if (await isAccountMultiSign(a)) {
        errors.recipient = new SourceHasMultiSign("", {
            currencyName: a.currency.name,
        });
    }
    */

    const fees = t.fees;

    if (fees.lte(0)) {
        errors.fees = new FeeNotLoaded();
    } else {
        const minRequiredBalance = useAllAmount ? fees : fees.plus(t.amount);

        if (minRequiredBalance.gt(a.balance)) {
            errors.amount = new NotEnoughSpendableBalance();
        }
    }

    /*
    if (wantsToSpendAmount)
        if (totalSpent.gt(a.balance.minus(baseReserve))) {
            errors.amount = new NotEnoughSpendableBalance(undefined, {
                minimumAmount: formatCurrencyUnit(
                    a.currency.units[0],
                    baseReserve,
                    {
                        disableRounding: true,
                        showCode: true,
                    }
                ),
            });
        }
        */

    // TODO: non existent token account ?
    if (!(await checkOnChainAccountExists(t.recipient))) {
        errors.amount = new NotEnoughBalanceBecauseDestinationNotCreated();
    }

    const amount =
        errors.amount || errors.fees
            ? new BigNumber(0)
            : useAllAmount
            ? a.balance.minus(fees)
            : t.amount;

    const totalSpent =
        errors.amount || errors.fees ? new BigNumber(0) : amount.plus(fees);

    const estimatedFees = errors.fees ? new BigNumber(0) : fees;

    return {
        errors,
        warnings,
        estimatedFees,
        amount,
        totalSpent,
    };
};

export default getTransactionStatus;
