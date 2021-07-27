// @flow
import { reflect as algorandReflect } from "../families/algorand/types";
import type { CoreStatics as CoreStatics_algorand } from "../families/algorand/types";
import type { CoreAccountSpecifics as CoreAccountSpecifics_algorand } from "../families/algorand/types";
import type { CoreOperationSpecifics as CoreOperationSpecifics_algorand } from "../families/algorand/types";
import type { CoreCurrencySpecifics as CoreCurrencySpecifics_algorand } from "../families/algorand/types";
import type { Transaction as algorandTransaction } from "../families/algorand/types";
import type { TransactionRaw as algorandTransactionRaw } from "../families/algorand/types";
import { reflect as bitcoinReflect } from "../families/bitcoin/types";
import type { CoreStatics as CoreStatics_bitcoin } from "../families/bitcoin/types";
import type { CoreAccountSpecifics as CoreAccountSpecifics_bitcoin } from "../families/bitcoin/types";
import type { CoreOperationSpecifics as CoreOperationSpecifics_bitcoin } from "../families/bitcoin/types";
import type { CoreCurrencySpecifics as CoreCurrencySpecifics_bitcoin } from "../families/bitcoin/types";
import type { Transaction as bitcoinTransaction } from "../families/bitcoin/types";
import type { TransactionRaw as bitcoinTransactionRaw } from "../families/bitcoin/types";
import type { NetworkInfo as bitcoinNetworkInfo } from "../families/bitcoin/types";
import type { NetworkInfoRaw as bitcoinNetworkInfoRaw } from "../families/bitcoin/types";
import { reflect as cosmosReflect } from "../families/cosmos/types";
import type { CoreStatics as CoreStatics_cosmos } from "../families/cosmos/types";
import type { CoreAccountSpecifics as CoreAccountSpecifics_cosmos } from "../families/cosmos/types";
import type { CoreOperationSpecifics as CoreOperationSpecifics_cosmos } from "../families/cosmos/types";
import type { CoreCurrencySpecifics as CoreCurrencySpecifics_cosmos } from "../families/cosmos/types";
import type { Transaction as cosmosTransaction } from "../families/cosmos/types";
import type { TransactionRaw as cosmosTransactionRaw } from "../families/cosmos/types";
import type { NetworkInfo as cosmosNetworkInfo } from "../families/cosmos/types";
import type { NetworkInfoRaw as cosmosNetworkInfoRaw } from "../families/cosmos/types";
import { reflect as crypto_orgReflect } from "../families/crypto_org/types";
import type { CoreStatics as CoreStatics_crypto_org } from "../families/crypto_org/types";
import type { CoreAccountSpecifics as CoreAccountSpecifics_crypto_org } from "../families/crypto_org/types";
import type { CoreOperationSpecifics as CoreOperationSpecifics_crypto_org } from "../families/crypto_org/types";
import type { CoreCurrencySpecifics as CoreCurrencySpecifics_crypto_org } from "../families/crypto_org/types";
import type { Transaction as crypto_orgTransaction } from "../families/crypto_org/types";
import type { TransactionRaw as crypto_orgTransactionRaw } from "../families/crypto_org/types";
import type { NetworkInfo as crypto_orgNetworkInfo } from "../families/crypto_org/types";
import type { NetworkInfoRaw as crypto_orgNetworkInfoRaw } from "../families/crypto_org/types";
import { reflect as ethereumReflect } from "../families/ethereum/types";
import type { CoreStatics as CoreStatics_ethereum } from "../families/ethereum/types";
import type { CoreAccountSpecifics as CoreAccountSpecifics_ethereum } from "../families/ethereum/types";
import type { CoreOperationSpecifics as CoreOperationSpecifics_ethereum } from "../families/ethereum/types";
import type { CoreCurrencySpecifics as CoreCurrencySpecifics_ethereum } from "../families/ethereum/types";
import type { Transaction as ethereumTransaction } from "../families/ethereum/types";
import type { TransactionRaw as ethereumTransactionRaw } from "../families/ethereum/types";
import type { NetworkInfo as ethereumNetworkInfo } from "../families/ethereum/types";
import type { NetworkInfoRaw as ethereumNetworkInfoRaw } from "../families/ethereum/types";
import { reflect as hederaReflect } from "../families/hedera/types";
import type { CoreStatics as CoreStatics_hedera } from "../families/hedera/types";
import type { CoreAccountSpecifics as CoreAccountSpecifics_hedera } from "../families/hedera/types";
import type { CoreOperationSpecifics as CoreOperationSpecifics_hedera } from "../families/hedera/types";
import type { CoreCurrencySpecifics as CoreCurrencySpecifics_hedera } from "../families/hedera/types";
import type { Transaction as hederaTransaction } from "../families/hedera/types";
import type { TransactionRaw as hederaTransactionRaw } from "../families/hedera/types";
import type { NetworkInfo as hederaNetworkInfo } from "../families/hedera/types";
import type { NetworkInfoRaw as hederaNetworkInfoRaw } from "../families/hedera/types";
import { reflect as neoReflect } from "../families/neo/types";
import type { CoreStatics as CoreStatics_neo } from "../families/neo/types";
import type { CoreAccountSpecifics as CoreAccountSpecifics_neo } from "../families/neo/types";
import type { CoreOperationSpecifics as CoreOperationSpecifics_neo } from "../families/neo/types";
import type { CoreCurrencySpecifics as CoreCurrencySpecifics_neo } from "../families/neo/types";
import type { Transaction as neoTransaction } from "../families/neo/types";
import type { TransactionRaw as neoTransactionRaw } from "../families/neo/types";
import type { NetworkInfo as neoNetworkInfo } from "../families/neo/types";
import type { NetworkInfoRaw as neoNetworkInfoRaw } from "../families/neo/types";
import { reflect as polkadotReflect } from "../families/polkadot/types";
import type { CoreStatics as CoreStatics_polkadot } from "../families/polkadot/types";
import type { CoreAccountSpecifics as CoreAccountSpecifics_polkadot } from "../families/polkadot/types";
import type { CoreOperationSpecifics as CoreOperationSpecifics_polkadot } from "../families/polkadot/types";
import type { CoreCurrencySpecifics as CoreCurrencySpecifics_polkadot } from "../families/polkadot/types";
import type { Transaction as polkadotTransaction } from "../families/polkadot/types";
import type { TransactionRaw as polkadotTransactionRaw } from "../families/polkadot/types";
import { reflect as rippleReflect } from "../families/ripple/types";
import type { CoreStatics as CoreStatics_ripple } from "../families/ripple/types";
import type { CoreAccountSpecifics as CoreAccountSpecifics_ripple } from "../families/ripple/types";
import type { CoreOperationSpecifics as CoreOperationSpecifics_ripple } from "../families/ripple/types";
import type { CoreCurrencySpecifics as CoreCurrencySpecifics_ripple } from "../families/ripple/types";
import type { Transaction as rippleTransaction } from "../families/ripple/types";
import type { TransactionRaw as rippleTransactionRaw } from "../families/ripple/types";
import type { NetworkInfo as rippleNetworkInfo } from "../families/ripple/types";
import type { NetworkInfoRaw as rippleNetworkInfoRaw } from "../families/ripple/types";
import { reflect as stellarReflect } from "../families/stellar/types";
import type { CoreStatics as CoreStatics_stellar } from "../families/stellar/types";
import type { CoreAccountSpecifics as CoreAccountSpecifics_stellar } from "../families/stellar/types";
import type { CoreOperationSpecifics as CoreOperationSpecifics_stellar } from "../families/stellar/types";
import type { CoreCurrencySpecifics as CoreCurrencySpecifics_stellar } from "../families/stellar/types";
import type { Transaction as stellarTransaction } from "../families/stellar/types";
import type { TransactionRaw as stellarTransactionRaw } from "../families/stellar/types";
import type { NetworkInfo as stellarNetworkInfo } from "../families/stellar/types";
import type { NetworkInfoRaw as stellarNetworkInfoRaw } from "../families/stellar/types";
import { reflect as tezosReflect } from "../families/tezos/types";
import type { CoreStatics as CoreStatics_tezos } from "../families/tezos/types";
import type { CoreAccountSpecifics as CoreAccountSpecifics_tezos } from "../families/tezos/types";
import type { CoreOperationSpecifics as CoreOperationSpecifics_tezos } from "../families/tezos/types";
import type { CoreCurrencySpecifics as CoreCurrencySpecifics_tezos } from "../families/tezos/types";
import type { Transaction as tezosTransaction } from "../families/tezos/types";
import type { TransactionRaw as tezosTransactionRaw } from "../families/tezos/types";
import type { NetworkInfo as tezosNetworkInfo } from "../families/tezos/types";
import type { NetworkInfoRaw as tezosNetworkInfoRaw } from "../families/tezos/types";
import { reflect as tronReflect } from "../families/tron/types";
import type { CoreStatics as CoreStatics_tron } from "../families/tron/types";
import type { CoreAccountSpecifics as CoreAccountSpecifics_tron } from "../families/tron/types";
import type { CoreOperationSpecifics as CoreOperationSpecifics_tron } from "../families/tron/types";
import type { CoreCurrencySpecifics as CoreCurrencySpecifics_tron } from "../families/tron/types";
import type { Transaction as tronTransaction } from "../families/tron/types";
import type { TransactionRaw as tronTransactionRaw } from "../families/tron/types";
import type { NetworkInfo as tronNetworkInfo } from "../families/tron/types";
import type { NetworkInfoRaw as tronNetworkInfoRaw } from "../families/tron/types";

export type SpecificStatics = {}
& CoreStatics_algorand
& CoreStatics_bitcoin
& CoreStatics_cosmos
& CoreStatics_crypto_org
& CoreStatics_ethereum
& CoreStatics_hedera
& CoreStatics_neo
& CoreStatics_polkadot
& CoreStatics_ripple
& CoreStatics_stellar
& CoreStatics_tezos
& CoreStatics_tron
export type CoreAccountSpecifics = {}
& CoreAccountSpecifics_algorand
& CoreAccountSpecifics_bitcoin
& CoreAccountSpecifics_cosmos
& CoreAccountSpecifics_crypto_org
& CoreAccountSpecifics_ethereum
& CoreAccountSpecifics_hedera
& CoreAccountSpecifics_neo
& CoreAccountSpecifics_polkadot
& CoreAccountSpecifics_ripple
& CoreAccountSpecifics_stellar
& CoreAccountSpecifics_tezos
& CoreAccountSpecifics_tron
export type CoreOperationSpecifics = {}
& CoreOperationSpecifics_algorand
& CoreOperationSpecifics_bitcoin
& CoreOperationSpecifics_cosmos
& CoreOperationSpecifics_crypto_org
& CoreOperationSpecifics_ethereum
& CoreOperationSpecifics_hedera
& CoreOperationSpecifics_neo
& CoreOperationSpecifics_polkadot
& CoreOperationSpecifics_ripple
& CoreOperationSpecifics_stellar
& CoreOperationSpecifics_tezos
& CoreOperationSpecifics_tron
export type CoreCurrencySpecifics = {}
& CoreCurrencySpecifics_algorand
& CoreCurrencySpecifics_bitcoin
& CoreCurrencySpecifics_cosmos
& CoreCurrencySpecifics_crypto_org
& CoreCurrencySpecifics_ethereum
& CoreCurrencySpecifics_hedera
& CoreCurrencySpecifics_neo
& CoreCurrencySpecifics_polkadot
& CoreCurrencySpecifics_ripple
& CoreCurrencySpecifics_stellar
& CoreCurrencySpecifics_tezos
& CoreCurrencySpecifics_tron
export type Transaction =
  | algorandTransaction
  | bitcoinTransaction
  | cosmosTransaction
  | crypto_orgTransaction
  | ethereumTransaction
  | hederaTransaction
  | neoTransaction
  | polkadotTransaction
  | rippleTransaction
  | stellarTransaction
  | tezosTransaction
  | tronTransaction
export type TransactionRaw =
  | algorandTransactionRaw
  | bitcoinTransactionRaw
  | cosmosTransactionRaw
  | crypto_orgTransactionRaw
  | ethereumTransactionRaw
  | hederaTransactionRaw
  | neoTransactionRaw
  | polkadotTransactionRaw
  | rippleTransactionRaw
  | stellarTransactionRaw
  | tezosTransactionRaw
  | tronTransactionRaw
export type NetworkInfo =
  | bitcoinNetworkInfo
  | cosmosNetworkInfo
  | crypto_orgNetworkInfo
  | ethereumNetworkInfo
  | hederaNetworkInfo
  | neoNetworkInfo
  | rippleNetworkInfo
  | stellarNetworkInfo
  | tezosNetworkInfo
  | tronNetworkInfo
export type NetworkInfoRaw =
  | bitcoinNetworkInfoRaw
  | cosmosNetworkInfoRaw
  | crypto_orgNetworkInfoRaw
  | ethereumNetworkInfoRaw
  | hederaNetworkInfoRaw
  | neoNetworkInfoRaw
  | rippleNetworkInfoRaw
  | stellarNetworkInfoRaw
  | tezosNetworkInfoRaw
  | tronNetworkInfoRaw
export const reflectSpecifics = (declare: *) => [
  algorandReflect(declare),
  bitcoinReflect(declare),
  cosmosReflect(declare),
  crypto_orgReflect(declare),
  ethereumReflect(declare),
  hederaReflect(declare),
  neoReflect(declare),
  polkadotReflect(declare),
  rippleReflect(declare),
  stellarReflect(declare),
  tezosReflect(declare),
  tronReflect(declare),
];
