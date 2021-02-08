// @flow
import { getMainAccount } from "../../account";
import createTransaction from "./js-createTransaction";
import prepareTransaction from "./js-prepareTransaction";
import getTransactionStatus from "./js-getTransactionStatus";

import { notCreatedStellarMockAddress } from "./test-dataset";

const estimateMaxSpendable = async ({
  account,
  parentAccount,
  transaction,
}) => {
  const mainAccount = getMainAccount(account, parentAccount);
  const t = await prepareTransaction(mainAccount, {
    ...createTransaction(),
    ...transaction,
    recipient: transaction?.recipient || notCreatedStellarMockAddress, // not used address
    useAllAmount: true,
  });
  const s = await getTransactionStatus(mainAccount, t);
  return s.amount;
};

export default estimateMaxSpendable;
