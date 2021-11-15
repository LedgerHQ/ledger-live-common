import network from "../../../network";
import {
  HASH_TRANSACTION,
  METACHAIN_SHARD,
  TRANSACTIONS_SIZE,
  ESDT_TRANSFER_GAS,
} from "../constants";
import { ElrondProtocolTransaction, ESDTToken, ESDTTransaction, NetworkInfo, Transaction } from "../types";
export default class ElrondApi {
  private API_URL: string;

  constructor(API_URL: string) {
    this.API_URL = API_URL;
  }

  async getAccountDetails(addr: string) {
    const {
      data: { balance, nonce },
    } = await network({
      method: "GET",
      url: `${this.API_URL}/accounts/${addr}`,
    });

    return {
      balance,
      nonce,
    };
  }

  async getValidators() {
    let data = [];

    try {
      const {
        data: { validators },
      } = await network({
        method: "GET",
        url: `${this.API_URL}/validator/statistics`,
      });
      data = validators;
    } catch (error) {
      return data;
    }

    return data;
  }

  async getNetworkConfig(): Promise<NetworkInfo> {
    const {
      data: {
        data: {
          config: {
            erd_chain_id: chainId,
            erd_denomination: denomination,
            erd_min_gas_limit: gasLimit,
            erd_min_gas_price: gasPrice,
            erd_gas_per_data_byte: gasPerByte,
          },
        },
      },
    } = await network({
      method: "GET",
      url: `${this.API_URL}/network/config`,
    });

    return {
      chainID: chainId,
      denomination,
      gasLimit,
      gasPrice,
      gasPerByte,
    };
  }

  async submit({ operation, signature }) {
    let { chainID, gasLimit, gasPrice } = await this.getNetworkConfig();
    const {
      senders: [sender],
      recipients: [receiver],
      value,
      transactionSequenceNumber: nonce,
      extra: { data },
    } = operation;

    if (data) {
    // gasLimit for an ESDT transfer
      gasLimit = ESDT_TRANSFER_GAS;
    }

    const transaction: ElrondProtocolTransaction = {
      nonce,
      value,
      receiver,
      sender,
      gasPrice,
      gasLimit,
      chainID,
      signature,
      data,
      ...HASH_TRANSACTION
    }

    const {
      data: {
        data: { txHash: hash },
      },
    } = await network({
      method: "POST",
      url: `${this.API_URL}/transaction/send`,
      data: transaction,
    });

    return hash;
  }

  async getHistory(addr: string, startAt: number): Promise<Transaction[]> {
    const { data: transactionsCount } = await network({
      method: "GET",
      url: `${this.API_URL}/accounts/${addr}/transactions/count?after=${startAt}`,
    });

    let allTransactions: Transaction[] = [];
    let from = 0;
    while (from <= transactionsCount) {
      const { data: transactions } = await network({
        method: "GET",
        url: `${this.API_URL}/accounts/${addr}/transactions?after=${startAt}&from=${from}&size=${TRANSACTIONS_SIZE}`,
      });

      allTransactions = [...allTransactions, ...transactions];

      from = from + TRANSACTIONS_SIZE;
    }

    return allTransactions;
  }

  async getESDTTransactionsForAddress(addr: string, token: string): Promise<Transaction[]> {
    const transactions = await this.getHistory(addr, 0);

    return transactions.filter(({tokenIdentifier}) => tokenIdentifier && tokenIdentifier==token);
  }

  async getESDTTokensForAddress(addr: string): Promise<ESDTToken[]> {
    const { data: tokens } = await network({
      method: "GET",
      url: `${this.API_URL}/accounts/${addr}/tokens`
    });

    return tokens;
  }

  async getBlockchainBlockHeight(): Promise<number> {
    const {
      data: [{ round: blockHeight }],
    } = await network({
      method: "GET",
      url: `${this.API_URL}/blocks?shard=${METACHAIN_SHARD}&fields=round`,
    });
    return blockHeight;
  }
}
