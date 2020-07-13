// @flow

import type { CryptoCurrency, ChildAccount, Account } from "../../types";
import type { Core, CoreAccount } from "../../libcore/types";
import type {
  CoreTezosLikeOriginatedAccount,
  CoreTezosLikeAccount,
} from "./types";
import { libcoreAmountToBigNumber } from "../../libcore/buildBigNumber";
import { buildOperation } from "../../libcore/buildAccount/buildOperation";
import { minimalOperationsBuilder } from "../../reconciliation";
import { shortAddressPreview } from "../../account";
import invariant from "invariant";

const OperationOrderKey = {
  date: 0,
};

async function buildOriginatedAccount({
  core,
  parentAccountId,
  currency,
  coreOriginatedAccount,
  existingOriginatedAccount,
}: {
  core: Core,
  parentAccountId: string,
  currency: CryptoCurrency,
  coreOriginatedAccount: CoreTezosLikeOriginatedAccount,
  existingOriginatedAccount: ChildAccount,
}) {
  let balance = await libcoreAmountToBigNumber(
    await coreOriginatedAccount.getBalance()
  );
  const address = await coreOriginatedAccount.getAddress();
  const query = await coreOriginatedAccount.queryOperations();
  await query.complete();
  await query.addOrder(OperationOrderKey.date, false);
  const coreOperations = await query.execute();

  const id = `${parentAccountId}+${address}`;

  const operations = await minimalOperationsBuilder(
    (existingOriginatedAccount && existingOriginatedAccount.operations) || [],
    coreOperations,
    (coreOperation) =>
      buildOperation({
        core,
        coreOperation,
        accountId: id,
        currency,
      })
  );

  const originatedAccount: $Exact<ChildAccount> = {
    type: "ChildAccount",
    id,
    name: shortAddressPreview(address),
    starred: false,
    parentId: parentAccountId,
    currency,
    address,
    balance,
    operationsCount: operations.length,
    operations,
    pendingOperations: [],
    creationDate:
      operations.length > 0
        ? operations[operations.length - 1].date
        : new Date(),
  };

  return originatedAccount;
}

async function tezosBuildOriginatedAccount({
  core,
  currency,
  core,
  coreAccount,
  accountId,
  existingAccount,
}: {
  core: Core,
  currency: CryptoCurrency,
  core: Core,
  coreAccount: CoreAccount,
  accountId: string,
  existingAccount: ?Account,
}): Promise<?(ChildAccount[])> {
  const originatedAccounts = [];
  const xtzAccount: CoreTezosLikeAccount = await new core.Tezos().fromCoreAccount(
    coreAccount
  );
  invariant(xtzAccount, "tezos account expected");
  const coreOAS: CoreTezosLikeOriginatedAccount[] = await xtzAccount.getOriginatedAccounts();

  const existingAccountByAddress = {};
  const existingAccountAddresses = [];

  if (existingAccount && existingAccount.subAccounts) {
    for (const existingSubAccount of existingAccount.subAccounts) {
      if (existingSubAccount.type === "ChildAccount") {
        const { address } = existingSubAccount;
        existingAccountAddresses.push(address);
        existingAccountByAddress[address] = existingSubAccount;
      }
    }
  }

  for (const coreOA of coreOAS) {
    const address = await coreOA.getAddress();
    const existingOriginatedAccount = existingAccountByAddress[address];
    const originatedAccount = await buildOriginatedAccount({
      core,
      parentAccountId: accountId,
      currency,
      coreOriginatedAccount: coreOA,
      existingOriginatedAccount,
    });

    if (originatedAccount) originatedAccounts.push(originatedAccount);
  }

  originatedAccounts.sort((a, b) => {
    const i = existingAccountAddresses.indexOf(a.address);
    const j = existingAccountAddresses.indexOf(b.address);
    if (i === j) return 0;
    if (i < 0) return 1;
    if (j < 0) return -1;
    return i - j;
  });

  return originatedAccounts;
}

export default tezosBuildOriginatedAccount;
