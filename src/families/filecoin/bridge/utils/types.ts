export interface TransactionResponse {
  amount: number;
  to: string;
  from: string;
  status: string;
  type: string;
  hash: string;
  timestamp: number;
  height: number;
}

export interface BalanceResponse {
  locked_balance: string;
  spendable_balance: string;
  total_balance: string;
}

export interface NetworkStatusResponse {
  current_block_identifier: BlockIdentifier;
  genesis_block_identifier: BlockIdentifier;
  oldest_block_identifier?: BlockIdentifier;
  current_block_timestamp: number;
}

interface BlockIdentifier {
  index: number;
  hash: string;
}
