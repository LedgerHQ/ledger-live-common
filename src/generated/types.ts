import { Transaction as algorandTransaction } from "../families/algorand/types";
import { TransactionRaw as algorandTransactionRaw } from "../families/algorand/types";
import { Transaction as bitcoinTransaction } from "../families/bitcoin/types";
import { TransactionRaw as bitcoinTransactionRaw } from "../families/bitcoin/types";
import { Transaction as celoTransaction } from "../families/celo/types";
import { TransactionRaw as celoTransactionRaw } from "../families/celo/types";
import { Transaction as cosmosTransaction } from "../families/cosmos/types";
import { TransactionRaw as cosmosTransactionRaw } from "../families/cosmos/types";
import { Transaction as crypto_orgTransaction } from "../families/crypto_org/types";
import { TransactionRaw as crypto_orgTransactionRaw } from "../families/crypto_org/types";
import { Transaction as elrondTransaction } from "../families/elrond/types";
import { TransactionRaw as elrondTransactionRaw } from "../families/elrond/types";
import { Transaction as ethereumTransaction } from "../families/ethereum/types";
import { TransactionRaw as ethereumTransactionRaw } from "../families/ethereum/types";
import { Transaction as filecoinTransaction } from "../families/filecoin/types";
import { TransactionRaw as filecoinTransactionRaw } from "../families/filecoin/types";
import { Transaction as neoTransaction } from "../families/neo/types";
import { TransactionRaw as neoTransactionRaw } from "../families/neo/types";
import { NetworkInfo as neoNetworkInfo } from "../families/neo/types";
import { NetworkInfoRaw as neoNetworkInfoRaw } from "../families/neo/types";
import { reflect as osmosisReflect } from "../families/osmosis/types";
import { CoreStatics as CoreStatics_osmosis } from "../families/osmosis/types";
import { CoreAccountSpecifics as CoreAccountSpecifics_osmosis } from "../families/osmosis/types";
import { CoreOperationSpecifics as CoreOperationSpecifics_osmosis } from "../families/osmosis/types";
import { CoreCurrencySpecifics as CoreCurrencySpecifics_osmosis } from "../families/osmosis/types";
import { Transaction as osmosisTransaction } from "../families/osmosis/types";
import { TransactionRaw as osmosisTransactionRaw } from "../families/osmosis/types";
import { NetworkInfo as osmosisNetworkInfo } from "../families/osmosis/types";
import { NetworkInfoRaw as osmosisNetworkInfoRaw } from "../families/osmosis/types";
import { reflect as polkadotReflect } from "../families/polkadot/types";
import { CoreStatics as CoreStatics_polkadot } from "../families/polkadot/types";
import { CoreAccountSpecifics as CoreAccountSpecifics_polkadot } from "../families/polkadot/types";
import { CoreOperationSpecifics as CoreOperationSpecifics_polkadot } from "../families/polkadot/types";
import { CoreCurrencySpecifics as CoreCurrencySpecifics_polkadot } from "../families/polkadot/types";
import { Transaction as polkadotTransaction } from "../families/polkadot/types";
import { TransactionRaw as polkadotTransactionRaw } from "../families/polkadot/types";
import { Transaction as rippleTransaction } from "../families/ripple/types";
import { TransactionRaw as rippleTransactionRaw } from "../families/ripple/types";
import { Transaction as solanaTransaction } from "../families/solana/types";
import { TransactionRaw as solanaTransactionRaw } from "../families/solana/types";
import { Transaction as stellarTransaction } from "../families/stellar/types";
import { TransactionRaw as stellarTransactionRaw } from "../families/stellar/types";
import { Transaction as tezosTransaction } from "../families/tezos/types";
import { TransactionRaw as tezosTransactionRaw } from "../families/tezos/types";
import { Transaction as tronTransaction } from "../families/tron/types";
import { TransactionRaw as tronTransactionRaw } from "../families/tron/types";

export type SpecificStatics = {}
& CoreStatics_algorand
& CoreStatics_bitcoin
& CoreStatics_celo
& CoreStatics_cosmos
& CoreStatics_crypto_org
& CoreStatics_elrond
& CoreStatics_ethereum
& CoreStatics_filecoin
& CoreStatics_neo
& CoreStatics_osmosis
& CoreStatics_polkadot
& CoreStatics_ripple
& CoreStatics_solana
& CoreStatics_stellar
& CoreStatics_tezos
& CoreStatics_tron
export type CoreAccountSpecifics = {}
& CoreAccountSpecifics_algorand
& CoreAccountSpecifics_bitcoin
& CoreAccountSpecifics_celo
& CoreAccountSpecifics_cosmos
& CoreAccountSpecifics_crypto_org
& CoreAccountSpecifics_elrond
& CoreAccountSpecifics_ethereum
& CoreAccountSpecifics_filecoin
& CoreAccountSpecifics_neo
& CoreAccountSpecifics_osmosis
& CoreAccountSpecifics_polkadot
& CoreAccountSpecifics_ripple
& CoreAccountSpecifics_solana
& CoreAccountSpecifics_stellar
& CoreAccountSpecifics_tezos
& CoreAccountSpecifics_tron
export type CoreOperationSpecifics = {}
& CoreOperationSpecifics_algorand
& CoreOperationSpecifics_bitcoin
& CoreOperationSpecifics_celo
& CoreOperationSpecifics_cosmos
& CoreOperationSpecifics_crypto_org
& CoreOperationSpecifics_elrond
& CoreOperationSpecifics_ethereum
& CoreOperationSpecifics_filecoin
& CoreOperationSpecifics_neo
& CoreOperationSpecifics_osmosis
& CoreOperationSpecifics_polkadot
& CoreOperationSpecifics_ripple
& CoreOperationSpecifics_solana
& CoreOperationSpecifics_stellar
& CoreOperationSpecifics_tezos
& CoreOperationSpecifics_tron
export type CoreCurrencySpecifics = {}
& CoreCurrencySpecifics_algorand
& CoreCurrencySpecifics_bitcoin
& CoreCurrencySpecifics_celo
& CoreCurrencySpecifics_cosmos
& CoreCurrencySpecifics_crypto_org
& CoreCurrencySpecifics_elrond
& CoreCurrencySpecifics_ethereum
& CoreCurrencySpecifics_filecoin
& CoreCurrencySpecifics_neo
& CoreCurrencySpecifics_osmosis
& CoreCurrencySpecifics_polkadot
& CoreCurrencySpecifics_ripple
& CoreCurrencySpecifics_solana
& CoreCurrencySpecifics_stellar
& CoreCurrencySpecifics_tezos
& CoreCurrencySpecifics_tron
export type Transaction =
  | algorandTransaction
  | bitcoinTransaction
  | celoTransaction
  | cosmosTransaction
  | crypto_orgTransaction
  | elrondTransaction
  | ethereumTransaction
  | filecoinTransaction
  | neoTransaction
  | osmosisTransaction
  | polkadotTransaction
  | rippleTransaction
  | solanaTransaction
  | stellarTransaction
  | tezosTransaction
  | tronTransaction
export type TransactionRaw =
  | algorandTransactionRaw
  | bitcoinTransactionRaw
  | celoTransactionRaw
  | cosmosTransactionRaw
  | crypto_orgTransactionRaw
  | elrondTransactionRaw
  | ethereumTransactionRaw
  | filecoinTransactionRaw
  | neoTransactionRaw
  | osmosisTransactionRaw
  | polkadotTransactionRaw
  | rippleTransactionRaw
  | solanaTransactionRaw
  | stellarTransactionRaw
  | tezosTransactionRaw
  | tronTransactionRaw
export type NetworkInfo =
  | bitcoinNetworkInfo
  | cosmosNetworkInfo
  | crypto_orgNetworkInfo
  | elrondNetworkInfo
  | ethereumNetworkInfo
  | filecoinNetworkInfo
  | neoNetworkInfo
  | osmosisNetworkInfo
  | rippleNetworkInfo
  | stellarNetworkInfo
  | tezosNetworkInfo
  | tronNetworkInfo
export type NetworkInfoRaw =
  | bitcoinNetworkInfoRaw
  | cosmosNetworkInfoRaw
  | crypto_orgNetworkInfoRaw
  | elrondNetworkInfoRaw
  | ethereumNetworkInfoRaw
  | filecoinNetworkInfoRaw
  | neoNetworkInfoRaw
  | osmosisNetworkInfoRaw
  | rippleNetworkInfoRaw
  | stellarNetworkInfoRaw
  | tezosNetworkInfoRaw
  | tronNetworkInfoRaw
export const reflectSpecifics = (declare: any): Array<{ OperationMethods: Record<string, unknown>, AccountMethods: Record<string, unknown> }> => [
  algorandReflect(declare),
  bitcoinReflect(declare),
  celoReflect(declare),
  cosmosReflect(declare),
  crypto_orgReflect(declare),
  elrondReflect(declare),
  ethereumReflect(declare),
  filecoinReflect(declare),
  neoReflect(declare),
  osmosisReflect(declare),
  polkadotReflect(declare),
  rippleReflect(declare),
  solanaReflect(declare),
  stellarReflect(declare),
  tezosReflect(declare),
  tronReflect(declare),
] as Array<{ OperationMethods: Record<string, unknown>, AccountMethods: Record<string, unknown> }>;
