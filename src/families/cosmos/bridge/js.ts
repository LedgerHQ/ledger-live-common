import {
  Account,
  AccountBridge,
  CurrencyBridge,
  Operation,
  TransactionStatus,
  SignOperationEvent,
  CryptoCurrency,
  AccountLike,
} from "../../../types";
import invariant from "invariant";
import type {
  CosmosValidatorItem,
  StatusErrorMap,
  Transaction,
} from "../types";
import { getValidators, hydrateValidators } from "../validators";
import { toHex } from "@cosmjs/encoding";
import { BigNumber } from "bignumber.js";
import {
  makeAccountBridgeReceive,
  makeSync,
  makeScanAccounts,
  GetAccountShape,
} from "../../../bridge/jsHelpers";
import { encodeAccountId, getMainAccount } from "../../../account";
import {
  getTransactions,
  getHeight,
  getAllBalances,
  getFees,
  // createWallet,
} from "../../../api/Cosmos";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import Cosmos from "@ledgerhq/hw-app-str";
import { Observable } from "rxjs";
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
// import { validateRecipient } from "../../../bridge/shared";
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
import { getAbandonSeedAddress } from "@ledgerhq/cryptoassets";
import { log } from "@ledgerhq/logs";
import CryptoOrgApp from "@ledgerhq/hw-app-cosmos";
import { open, close } from "../../../hw";
import { encodeOperationId } from "../../../operation";

// the balance does not update straightaway so we should ignore recent operations if they are in pending for a bit
const preferPendingOperationsUntilBlockValidation = 35;

const txToOps = (info: any, id: string, txs: any): any => {
  const { address } = info;
  const ops: Operation[] = [];

  for (const tx of txs) {
    const hash = toHex(tx.hash).toUpperCase();
    const txlog = JSON.parse(tx.result.log);

    let from;
    let to;
    let value;

    for (const t of txlog[0].events) {
      for (const a of t.attributes) {
        switch (a.key) {
          case "sender":
            from = a.value;
            break;
          case "recipient":
            to = a.value;
            break;
          case "amount":
            value = new BigNumber(a.value.replace("uatom", ""));
            break;
        }
      }
    }

    const sending = address === from;
    const receiving = address === to;

    if (sending) {
      ops.push({
        id: `${id}-${hash}-OUT`,
        hash,
        type: "OUT",
        value: value.plus(tx.fee),
        fee: tx.fee,
        blockHeight: tx.height,
        blockHash: null,
        accountId: id,
        senders: [from],
        recipients: [to],
        date: tx.date,
        extra: {},
      });
    }

    if (receiving) {
      ops.push({
        id: `${id}-${hash}-IN`,
        hash,
        type: "IN",
        value,
        fee: tx.fee,
        blockHeight: tx.height,
        blockHash: null,
        accountId: id,
        senders: [from],
        recipients: [to],
        date: tx.date,
        extra: {},
      });
    }
  }

  return ops;
};

const postSync = (initial: Account, parent: Account): Account => {
  function evictRecentOpsIfPending(a) {
    a.pendingOperations.forEach((pending) => {
      const i = a.operations.findIndex((o) => o.id === pending.id);

      if (i !== -1) {
        const diff = parent.blockHeight - (a.operations[i].blockHeight || 0);

        if (diff < preferPendingOperationsUntilBlockValidation) {
          a.operations.splice(i, 1);
        }
      }
    });
  }

  evictRecentOpsIfPending(parent);
  parent.subAccounts && parent.subAccounts.forEach(evictRecentOpsIfPending);
  return parent;
};

const getAccountShape: GetAccountShape = async (info) => {
  const { address, currency, derivationMode } = info;

  const accountId = encodeAccountId({
    type: "js",
    version: "2",
    currencyId: currency.id,
    xpubOrAddress: address,
    derivationMode,
  });

  const balance = await getAllBalances(address);

  const blockHeight = await getHeight();
  const txs = await getTransactions(address);
  const operations = txToOps(info, accountId, txs);

  const shape = {
    id: accountId,
    balance,
    spendableBalance: balance,
    operationsCount: operations.length,
    blockHeight,
    cosmosResources: {
      delegations: [],
      redelegations: [],
      unbondings: [],
      delegatedBalance: new BigNumber(0),
      pendingRewardsBalance: new BigNumber(0),
      unbondingBalance: new BigNumber(0),
      withdrawAddress: "",
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

const updateTransaction = (t, patch) => {
  if ("recipient" in patch && patch.recipient !== t.recipient) {
    return { ...t, ...patch, userGasLimit: null, estimatedGasLimit: null };
  }

  return { ...t, ...patch };
};

const receive = makeAccountBridgeReceive();

const estimateMaxSpendable = async ({
  account,
  parentAccount,
  transaction,
}: {
  account: AccountLike;
  parentAccount: Account;
  transaction: Transaction;
}): Promise<BigNumber> => {
  const mainAccount = getMainAccount(account, parentAccount);
  const t = await prepareTransaction(mainAccount, {
    ...createTransaction(),
    ...transaction,
    recipient:
      transaction?.recipient || getAbandonSeedAddress(mainAccount.currency.id),
    useAllAmount: true,
  });
  const s = await getTransactionStatus(mainAccount, t);
  return s.amount;
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
    /*
  } else {
    const { recipientError, recipientWarning } = await validateRecipient(
      a.currency,
      t.recipient
    );

    if (recipientError) {
      errors.recipient = recipientError;
    }

    if (recipientWarning) {
      warnings.recipient = recipientWarning;
    }
  */
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
  log("dump", "promise", errors);
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

const prepareTransaction = async (a, t: Transaction): Promise<Transaction> => {
  return t;
};

const broadcast = async ({ signedOperation: { signature } }) => {
  return await broadcast(signature);
};

const signOperation = ({
  account,
  deviceId,
  transaction,
}: {
  account: Account;
  deviceId: any;
  transaction: Transaction;
}): Observable<SignOperationEvent> =>
  new Observable((o) => {
    async function main() {
      const transport = await open(deviceId);

      try {
        o.next({
          type: "device-signature-requested",
        });

        const hwApp = new CryptoOrgApp(transport);
        const address = account.freshAddresses[0];
        const { publicKey } = await hwApp.getAddress(
          address.derivationPath,
          "cosmos",
          false
        );

        /*
        const unsigned = await buildTransaction(
          account,
          transaction,
          publicKey
        );
        */
        // Sign by device
        const { signature } = await hwApp.sign(
          address.derivationPath,
          "0"
          //  unsigned.toSignDocument(0).toUint8Array()
        );

        // Ledger has encoded the sig in ASN1 DER format, but we need a 64-byte buffer of <r,s>
        // DER-encoded signature from Ledger
        if (signature != null) {
          /*
          const base64Sig = convertASN1toBase64(signature);
          const signed = unsigned
            .setSignature(
              0,
              utils.Bytes.fromUint8Array(new Uint8Array(base64Sig))
            )
            .toSigned()
            .getHexEncoded();
          o.next({
            type: "device-signature-granted",
          });
          */

          const operation = buildOptimisticOperation(
            account,
            transaction,
            transaction.fees ?? new BigNumber(0),
            false
          );

          o.next({
            type: "signed",
            signedOperation: {
              operation,
              // signature: signed,
              signature: "signed",
              expirationDate: null,
            },
          });
        }
      } finally {
        close(transport, deviceId);
      }
    }

    main().then(
      () => o.complete(),
      (e) => o.error(e)
    );
  });

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

const buildOptimisticOperation = (
  account: Account,
  transaction: Transaction,
  fee: BigNumber,
  signUsingHash: boolean
): Operation => {
  const type = "OUT";
  const value = new BigNumber(transaction.amount);
  const operation: Operation = {
    id: encodeOperationId(account.id, "", type),
    hash: "",
    type,
    value,
    fee,
    blockHash: null,
    blockHeight: account.blockHeight,
    senders: [account.freshAddress],
    recipients: [transaction.recipient].filter(Boolean),
    accountId: account.id,
    // transactionSequenceNumber: getNonce(account),
    transactionSequenceNumber: 0,
    date: new Date(),
    extra: {
      signUsingHash,
    },
  };
  return operation;
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
  broadcast,
};

export default {
  currencyBridge,
  accountBridge,
};
