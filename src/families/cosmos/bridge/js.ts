import {
  Account,
  AccountBridge,
  CurrencyBridge,
  Operation,
  TransactionStatus,
  SignOperationEvent,
  CryptoCurrency,
} from "../../../types";
import invariant from "invariant";
import type {
  CosmosValidatorItem,
  StatusErrorMap,
  Transaction,
} from "../types";
import { getValidators, hydrateValidators } from "../validators";
import { BigNumber } from "bignumber.js";
import {
  makeAccountBridgeReceive,
  makeSync,
  makeScanAccounts,
  GetAccountShape,
} from "../../../bridge/jsHelpers";
import { encodeAccountId, getMainAccount } from "../../../account";
import {
  broadcast,
  getAccount,
  getChainId,
  getFees,
  getSequence,
} from "../../../api/Cosmos";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import Cosmos from "@ledgerhq/hw-app-str";
import {
  asSafeCosmosPreloadData,
  setCosmosPreloadData,
} from "../preloadedData";
import {
  AmountRequired,
  FeeNotLoaded,
  InvalidAddress,
  InvalidAddressBecauseDestinationIsAlsoSource,
  NotEnoughBalance,
  RecommendUndelegation,
} from "@ledgerhq/errors";
import {
  COSMOS_MAX_DELEGATIONS,
  COSMOS_MAX_REDELEGATIONS,
  COSMOS_MAX_UNBONDINGS,
  getMaxEstimatedBalance,
} from "../logic";
import {
  ClaimRewardsFeesWarning,
  CosmosDelegateAllFundsWarning,
  CosmosRedelegationInProgress,
  CosmosTooManyValidators,
  NotEnoughDelegationBalance,
} from "../../../errors";
import { Observable } from "rxjs";
import { withDevice } from "../../../hw/deviceAccess";
import { LedgerSigner } from "@cosmjs/ledger-amino";
import { makeCosmoshubPath, makeSignDoc, StdFee } from "@cosmjs/amino";
import { makeStdTx } from "@cosmjs/launchpad";

const txToOps = (info: any, id: string, txs: any): any => {
  const { address } = info;
  const ops: Operation[] = [];

  for (const hash of Object.keys(txs)) {
    const txlog = JSON.parse(txs[hash].result.log);

    const op: Operation = {
      id: "",
      hash: hash,
      type: "" as any,
      value: new BigNumber(0),
      fee: txs[hash].fee,
      blockHash: null,
      blockHeight: txs[hash].height,
      senders: [] as any,
      recipients: [] as any,
      accountId: id,
      date: txs[hash].date,
      extra: {
        validators: [] as any,
      },
    };

    for (const t of txlog[0].events) {
      for (const a of t.attributes) {
        switch (a.key) {
          case "sender":
            op.senders.push(a.value);
            break;
          case "recipient":
            op.recipients.push(a.value);
            break;
          case "amount":
            if (op.value.eq(0)) {
              op.value = op.value.plus(a.value.replace("uatom", ""));
            }

            break;
          case "validator":
            op.extra.validators.push({ amount: op.value, address: a.value });
            break;
          case "new_shares":
            break;
        }
      }

      // todo: handle REDELEGATE and UNDELEGATE operations

      if (t.type === "delegate") {
        op.type = "DELEGATE";
        op.value = new BigNumber(txs[hash].fee);
      }

      if (t.type === "withdraw_rewards") {
        op.type = "REWARD";
        op.value = new BigNumber(txs[hash].fee);
      }
    }

    if (!op.type && address === op.senders[0]) {
      op.type = "OUT";
      op.value = op.value.plus(txs[hash].fee);
    }

    if (!op.type && address === op.recipients[0]) {
      op.type = "IN";
    }

    // remove duplicates
    op.recipients = op.recipients.filter((element, index) => {
      return op.recipients.indexOf(element) === index;
    });

    op.senders = op.senders.filter((element, index) => {
      return op.senders.indexOf(element) === index;
    });

    op.id = `${id}-${hash}-${op.type}`;
    ops.push(op);
  }

  return ops;
};

const postSync = (initial: Account, parent: Account) => parent;

const getAccountShape: GetAccountShape = async (info) => {
  const { address, currency, derivationMode } = info;

  const accountId = encodeAccountId({
    type: "js",
    version: "2",
    currencyId: currency.id,
    xpubOrAddress: address,
    derivationMode,
  });

  const { balances, blockHeight, txs, delegations, withdrawAddress } =
    await getAccount(address);
  const operations = txToOps(info, accountId, txs);
  let balance = balances;
  let delegatedBalance = new BigNumber(0);
  let pendingRewardsBalance = new BigNumber(0);
  let unbondingBalance = new BigNumber(0);

  for (const delegation of delegations) {
    delegatedBalance = delegatedBalance.plus(delegation.amount);
    balance = balance.plus(delegation.amount);

    pendingRewardsBalance = pendingRewardsBalance.plus(
      delegation.pendingRewards
    );

    if (delegation.status === "unbonding") {
      unbondingBalance = unbondingBalance.plus(delegation.amount);
    }
  }

  // todo: calculate estimatedFees
  const estimatedFees = new BigNumber(0);

  let spendableBalance = balance
    .minus(estimatedFees)
    .minus(unbondingBalance.plus(delegatedBalance));

  if (spendableBalance.lt(0)) {
    spendableBalance = new BigNumber(0);
  }

  const shape = {
    id: accountId,
    balance: balance,
    spendableBalance,
    operationsCount: operations.length,
    blockHeight,
    cosmosResources: {
      delegations,
      redelegations: [],
      unbondings: [],
      delegatedBalance,
      pendingRewardsBalance,
      unbondingBalance,
      withdrawAddress,
    },
  };

  if (shape.spendableBalance && shape.spendableBalance.lt(0)) {
    shape.spendableBalance = new BigNumber(0);
  }

  return { ...shape, operations };
};

const sync = makeSync(getAccountShape, postSync);

const createTransaction = (): Transaction => ({
  family: "cosmos",
  mode: "send",
  amount: new BigNumber(0),
  fees: null,
  gas: null,
  recipient: "",
  useAllAmount: false,
  networkInfo: null,
  memo: null,
  cosmosSourceValidator: null,
  validators: [],
});

const updateTransaction = (t, patch) => ({ ...t, ...patch });

const receive = makeAccountBridgeReceive();

const estimateMaxSpendable = ({ account, parentAccount, transaction }) => {
  const mainAccount = getMainAccount(account, parentAccount);
  const estimatedFees = transaction?.fees || new BigNumber(5000);
  return Promise.resolve(
    BigNumber.max(0, mainAccount.balance.minus(estimatedFees))
  );
};

const getDelegateTransactionStatus = async (
  a: Account,
  t: Transaction,
  isPreValidation = false
): Promise<TransactionStatus> => {
  const errors: StatusErrorMap = {};
  const warnings: StatusErrorMap = {};
  if (
    t.validators.some(
      (v) => !v.address || !v.address.includes("cosmosvaloper")
    ) ||
    t.validators.length === 0
  )
    errors.recipient = new InvalidAddress(undefined, {
      currencyName: a.currency.name,
    });

  if (t.validators.length > COSMOS_MAX_DELEGATIONS) {
    errors.validators = new CosmosTooManyValidators();
  }

  let amount = t.validators.reduce(
    (old, current) => old.plus(current.amount),
    new BigNumber(0)
  );

  if (amount.eq(0)) {
    errors.amount = new AmountRequired();
  }

  const estimatedFees = t.fees || new BigNumber(0);

  if (!isPreValidation && !t.fees) {
    errors.fees = new FeeNotLoaded();
  }

  let totalSpent = amount.plus(estimatedFees);

  if (totalSpent.eq(a.spendableBalance)) {
    warnings.delegate = new CosmosDelegateAllFundsWarning();
  }

  if (
    !errors.recipient &&
    !errors.amount &&
    (amount.lt(0) || totalSpent.gt(a.spendableBalance))
  ) {
    errors.amount = new NotEnoughBalance();
    amount = new BigNumber(0);
    totalSpent = new BigNumber(0);
  }

  return Promise.resolve({
    errors,
    warnings,
    estimatedFees,
    amount,
    totalSpent,
  });
};

const getSendTransactionStatus = async (
  a: Account,
  t: Transaction,
  isPreValidation = false
): Promise<TransactionStatus> => {
  const errors: StatusErrorMap = {};
  const warnings: StatusErrorMap = {};

  if (a.freshAddress === t.recipient) {
    errors.recipient = new InvalidAddressBecauseDestinationIsAlsoSource();
  } else {
    // todo validate recipient
  }

  let amount = t.amount;

  if (amount.lte(0) && !t.useAllAmount) {
    errors.amount = new AmountRequired();
  }

  t.fees = await getFees();
  const estimatedFees = t.fees || new BigNumber(0);

  if (!isPreValidation && (!t.fees || !t.fees.gt(0))) {
    errors.fees = new FeeNotLoaded();
  }

  amount = t.useAllAmount ? getMaxEstimatedBalance(a, estimatedFees) : amount;
  const totalSpent = amount.plus(estimatedFees);

  if (
    (amount.lte(0) && t.useAllAmount) || // if use all Amount sets an amount at 0
    (!errors.recipient && !errors.amount && totalSpent.gt(a.spendableBalance)) // if spendable balance lower than total
  ) {
    errors.amount = new NotEnoughBalance();
  }

  if (
    a.cosmosResources &&
    a.cosmosResources.delegations.length > 0 &&
    t.useAllAmount
  ) {
    warnings.amount = new RecommendUndelegation();
  }

  return Promise.resolve({
    errors,
    warnings,
    estimatedFees,
    amount,
    totalSpent,
  });
};

const redelegationStatusError = (a: Account, t: Transaction) => {
  if (a.cosmosResources) {
    const redelegations = a.cosmosResources.redelegations;
    invariant(
      redelegations.length < COSMOS_MAX_REDELEGATIONS,
      "redelegation should not have more than 6 entries"
    );
    if (
      redelegations.some((redelegation) => {
        const dstValidator = redelegation.validatorDstAddress;
        return (
          dstValidator === t.cosmosSourceValidator &&
          redelegation.completionDate > new Date()
        );
      })
    )
      return new CosmosRedelegationInProgress();
    if (t.cosmosSourceValidator === t.validators[0].address)
      return new InvalidAddressBecauseDestinationIsAlsoSource();
  }

  return isDelegable(a, t.cosmosSourceValidator, t.validators[0].amount);
};

const isDelegable = (
  a: Account,
  address: string | undefined | null,
  amount: BigNumber
) => {
  const { cosmosResources } = a;
  invariant(cosmosResources, "cosmosResources should exist");

  if (
    cosmosResources &&
    cosmosResources.delegations.some(
      (delegation) =>
        delegation.validatorAddress === address && delegation.amount.lt(amount)
    )
  ) {
    return new NotEnoughDelegationBalance();
  }

  return null;
};

const getTransactionStatus = async (
  a: Account,
  t: Transaction,
  isPreValidation = false
): Promise<TransactionStatus> => {
  if (t.mode === "send") {
    // We isolate the send transaction that it's a little bit different from the rest
    return await getSendTransactionStatus(a, t, isPreValidation);
  } else if (t.mode === "delegate") {
    return await getDelegateTransactionStatus(a, t, isPreValidation);
  }

  const errors: StatusErrorMap = {};
  const warnings: StatusErrorMap = {};
  // here we only treat about all other mode than delegate and send
  if (
    t.validators.some(
      (v) => !v.address || !v.address.includes("cosmosvaloper")
    ) ||
    t.validators.length === 0
  )
    errors.recipient = new InvalidAddress(undefined, {
      currencyName: a.currency.name,
    });

  if (t.mode === "redelegate") {
    const redelegationError = redelegationStatusError(a, t);

    if (redelegationError) {
      // Note : note sure if I have to put this error on this field
      errors.redelegation = redelegationError;
    }
  } else if (t.mode === "undelegate") {
    invariant(
      a.cosmosResources &&
        a.cosmosResources.unbondings.length < COSMOS_MAX_UNBONDINGS,
      "unbondings should not have more than 6 entries"
    );
    if (t.validators.length === 0)
      errors.recipient = new InvalidAddress(undefined, {
        currencyName: a.currency.name,
      });
    const [first] = t.validators;
    const unbondingError = first && isDelegable(a, first.address, first.amount);

    if (unbondingError) {
      errors.unbonding = unbondingError;
    }
  }

  const validatorAmount = t.validators.reduce(
    (old, current) => old.plus(current.amount),
    new BigNumber(0)
  );

  if (t.mode !== "claimReward" && validatorAmount.lte(0)) {
    errors.amount = new AmountRequired();
  }

  const estimatedFees = t.fees || new BigNumber(0);

  if (!isPreValidation && !t.fees) {
    errors.fees = new FeeNotLoaded();
  }

  let totalSpent = estimatedFees;

  if (["claimReward", "claimRewardCompound"].includes(t.mode)) {
    const { cosmosResources } = a;
    invariant(cosmosResources, "cosmosResources should exist");
    const claimReward =
      t.validators.length && cosmosResources
        ? cosmosResources.delegations.find(
            (delegation) =>
              delegation.validatorAddress === t.validators[0].address
          )
        : null;

    if (claimReward && estimatedFees.gt(claimReward.pendingRewards)) {
      warnings.claimReward = new ClaimRewardsFeesWarning();
    }
  }

  if (
    !errors.recipient &&
    !errors.amount &&
    (validatorAmount.lt(0) || totalSpent.gt(a.spendableBalance))
  ) {
    errors.amount = new NotEnoughBalance();
    totalSpent = new BigNumber(0);
  }

  return Promise.resolve({
    errors,
    warnings,
    estimatedFees,
    amount: new BigNumber(0),
    totalSpent,
  });
};

const prepareTransaction = async (a, t) => t;

const signOperation = ({
  account,
  deviceId,
  transaction,
}: {
  account: Account;
  deviceId: any;
  transaction: Transaction;
}): Observable<SignOperationEvent> =>
  withDevice(deviceId)((transport) =>
    Observable.create((o) => {
      let cancelled;

      async function main() {
        const { fees } = transaction;
        if (!fees) throw new FeeNotLoaded();

        const { freshAddress } = account;

        const ledgerSigner = new LedgerSigner(transport, {
          // todo: handle path derivation
          hdPaths: [makeCosmoshubPath(0)],
        });

        o.next({ type: "device-signature-requested" });

        let msg;
        switch (transaction.mode) {
          case "send":
            msg = {
              type: "cosmos-sdk/MsgSend",
              value: {
                from_address: freshAddress,
                to_address: transaction.recipient,
                amount: [
                  {
                    amount: `${transaction.amount}`,
                    denom: "ucosm",
                  },
                ],
              },
            };

            break;
          case "delegate":
            break;
          case "undelegate":
            break;
          default:
            throw "not supported";
        }

        const accountNumber = 0;

        const defaultFee: StdFee = {
          amount: [
            {
              amount: `${transaction.fees}`,
              denom: "ucosm",
            },
          ],
          gas: `${transaction.gas}`,
        };

        const signDoc = makeSignDoc(
          [msg],
          defaultFee,
          await getChainId(),
          transaction.memo || "",
          accountNumber,
          await getSequence(freshAddress)
        );

        const { signed, signature } = await ledgerSigner.signAmino(
          freshAddress,
          signDoc
        );

        const signedTx = makeStdTx(signed, signature);

        if (cancelled) {
          return;
        }

        o.next({ type: "device-signature-granted" });

        // build optimistic operation
        const txHash = ""; // resolved at broadcast time
        const senders = [freshAddress];
        const recipients = [transaction.recipient];
        const accountId = account.id;

        const operation = {
          id: `${accountId}-${txHash}-OUT`,
          hash: txHash,
          type: "OUT",
          value: transaction.amount,
          fee: fees,
          extra: {
            storageLimit: 0,
            gasLimit: 0,
            // storageLimit: transaction.storageLimit,
            // gasLimit: transaction.gasLimit,
            opbytes: signedTx,
          },
          blockHash: null,
          blockHeight: null,
          senders,
          recipients,
          accountId,
          date: new Date(),
        };

        o.next({
          type: "signed",
          signedOperation: {
            operation,
            signature,
            expirationDate: null,
          },
        });
      }

      main().then(
        () => o.complete(),
        (e) => o.error(e)
      );

      return () => {
        cancelled = true;
      };
    })
  );

const getPreloadStrategy = (_currency) => ({
  preloadMaxAge: 30 * 1000,
});

const currencyBridge: CurrencyBridge = {
  getPreloadStrategy,
  preload: async (currency: CryptoCurrency) => {
    const validators = await getValidators(currency);
    setCosmosPreloadData({
      validators,
    });
    return Promise.resolve({
      validators,
    });
  },
  hydrate: (data: { validators?: CosmosValidatorItem[] }) => {
    if (!data || typeof data !== "object") return;
    const { validators } = data;
    if (
      !validators ||
      typeof validators !== "object" ||
      !Array.isArray(validators)
    )
      return;
    hydrateValidators(validators);
    setCosmosPreloadData(asSafeCosmosPreloadData(data));
  },
  scanAccounts: makeScanAccounts(getAccountShape),
};

const accountBridge: AccountBridge<Transaction> = {
  createTransaction,
  updateTransaction,
  prepareTransaction,
  estimateMaxSpendable,
  getTransactionStatus,
  sync,
  receive,
  signOperation,
  broadcast: async ({ signedOperation }) => {
    return broadcast({
      signedOperation,
    });
  },
};

export default {
  currencyBridge,
  accountBridge,
};
