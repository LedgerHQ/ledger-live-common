import { BigNumber } from "bignumber.js";
import { getMainAccount } from "../../account";

const estimateMaxSpendable = ({ account, parentAccount, transaction }) => {
  const mainAccount = getMainAccount(account, parentAccount);
  const estimatedFees = transaction?.fees || new BigNumber(5000);

  return Promise.resolve(
    BigNumber.max(0, mainAccount.balance.minus(estimatedFees))
  );
};

export default estimateMaxSpendable;
