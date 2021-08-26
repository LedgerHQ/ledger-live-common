import { BigNumber } from "bignumber.js";
import type { Operation, OperationType } from "../../types";
import type { CoreOperation } from "../../libcore/types";
import { encodeOperationId } from "../../operation";
const OperationTypeMap = {
  "0": "OUT",
  "1": "IN",
};

export async function buildESDTOperation(arg: {
  coreOperation: CoreOperation;
  accountId: string;
  tokenId: string;
}) {
  const { coreOperation, accountId, tokenId } = arg;

  const operationType = await coreOperation.getOperationType();
  const type = OperationTypeMap[operationType];
  const date = new Date(await coreOperation.getDate());

  // const op: Operation = {
  //   id,
  //   type: type as OperationType,
  //   value: new BigNumber(value),
  //   hash,
  //   fee: new BigNumber(fee),
  //   senders: [sender],
  //   recipients: receiver,
  //   blockHeight,
  //   blockHash: null,
  //   accountId,
  //   date,
  //   extra: {},
  // };
  return null;
}
