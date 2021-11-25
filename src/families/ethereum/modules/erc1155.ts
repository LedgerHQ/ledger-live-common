import eip55 from "eip55";
import abi from "ethereumjs-abi";
import invariant from "invariant";
import BigNumber from "bignumber.js";
import {
  createCustomErrorClass,
  NotEnoughBalanceInParentAccount,
} from "@ledgerhq/errors";
import { validateRecipient } from "../transaction";
import type { ModeModule, Transaction } from "../types";
import type { Account } from "../../../types";

const notOwnedNft = createCustomErrorClass("NotOwnedNft");
const notEnoughNftOwned = createCustomErrorClass("NotEnoughNftOwned");
const notTokenIdsProvided = createCustomErrorClass("NotTokenIdsProvided");

export type Modes = "erc1155.transfer";

const erc1155Transfer: ModeModule = {
  /**
   * Tx data is filled during the buildEthereumTx
   */
  fillTransactionData(a, t, tx) {
    const data = serializeTransactionData(a, t);
    invariant(data, "serializeTransactionData provided no data");
    tx.data = "0x" + (data as Buffer).toString("hex");
    tx.to = t.collection;
    tx.value = "0x00";
  },

  /**
   * Tx status is filled after the buildEthereumTx
   */
  fillTransactionStatus: (a, t, result) => {
    validateRecipient(a.currency, t.recipient, result);

    if (!result.errors.recipient) {
      result.totalSpent = result.estimatedFees;
      result.amount = new BigNumber(t.amount);

      if (result.estimatedFees.gt(a.spendableBalance)) {
        result.errors.amount = new NotEnoughBalanceInParentAccount();
      }

      const enoughTokensOwned: true | Error =
        t.tokenIds?.reduce((acc, tokenId, index) => {
          if (acc instanceof Error) {
            return acc;
          }

          const nft = a.nfts?.find((n) => n.tokenId === tokenId);
          const transferQuantity = Number(t.quantities?.[index]);

          if (!nft) {
            return new notOwnedNft();
          }

          if (transferQuantity && !nft.amount.gte(transferQuantity)) {
            return new notEnoughNftOwned();
          }

          return true;
        }, true as true | Error) || new notTokenIdsProvided();

      if (!enoughTokensOwned || enoughTokensOwned instanceof Error) {
        result.errors.amount = enoughTokensOwned;
      }
    }
  },

  /**
   * This will only be used by LLM & LLD, not the HW.
   */
  fillDeviceTransactionConfig(input, fields) {
    fields.push({
      type: "text",
      label: "Type",
      value: `ERC721.transfer`,
    });

    fields.push({
      type: "text",
      label: "Collection",
      value: input.transaction.collection ?? "",
    });

    fields.push({
      type: "text",
      label: "Token IDs",
      value: input.transaction.tokenIds?.join(",") ?? "",
    });

    fields.push({
      type: "text",
      label: "Quantities",
      value: input.transaction.quantities?.join(",") ?? "",
    });
  },

  /**
   * Optimistic Operation is filled post signing
   */
  fillOptimisticOperation(a, t, op) {
    op.type = "FEES";
    op.extra = {
      ...op.extra,
      approving: true, // workaround to track the status ENABLING
    };
  },
};

function serializeTransactionData(
  account: Account,
  transaction: Transaction
): Buffer | null | undefined {
  const from = eip55.encode(account.freshAddress);
  const to = eip55.encode(transaction.recipient);
  const tokenIds = transaction.tokenIds || [];
  const quantities = transaction.quantities?.map((q) => q.toFixed()) || [];

  return tokenIds?.length > 1
    ? abi.simpleEncode(
        "safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)",
        from,
        to,
        tokenIds,
        quantities,
<<<<<<< HEAD
        "0x00",
=======
        "0x00"
>>>>>>> 5a9cae5c4cfa7ca77fe712871d7941ac859001f7
      )
    : abi.simpleEncode(
        "safeTransferFrom(address,address,uint256,uint256,bytes)",
        from,
        to,
        tokenIds[0],
        quantities[0],
<<<<<<< HEAD
        "0x00",
=======
        "0x00"
>>>>>>> 5a9cae5c4cfa7ca77fe712871d7941ac859001f7
      );
}

export const modes: Record<Modes, ModeModule> = {
  "erc1155.transfer": erc1155Transfer,
};
