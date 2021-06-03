#!/bin/bash

set -e
cd $(dirname $0)

targets="\
customAddressValidation.ts \
hw-getAddress.ts \
hw-signMessage.ts \
libcore-buildOperation.ts \
libcore-buildSubAccounts.ts \
libcore-getFeesForTransaction.ts \
libcore-postSyncPatch.ts \
libcore-postBuildAccount.ts \
libcore-getAccountNetworkInfo.ts \
libcore-mergeOperations.ts \
transaction.ts \
bridge/ts.ts \
bridge/libcore.ts \
bridge/mock.ts \
cli-transaction.ts \
specs.ts \
speculos-deviceActions.ts \
deviceTransactionConfig.ts \
test-dataset.ts \
test-specifics.ts \
mock.ts \
account.ts \
exchange.ts \
presync.ts \
"

withoutNetworkInfo=("algorand polkadot")

cd ../src

rm -rf generated
mkdir generated
mkdir generated/bridge

genTarget () {
  t=$1
  echo '// @flow'
  for family in $families; do
    if [ -f $family/$t ]; then
      echo -n 'import '$family' from "'
      OIFS=$IFS
      IFS="/"
      for f in $t; do
        echo -n '../'
      done
      IFS=$OIFS
      echo -n 'families/'$family/$t'";'
      echo
    fi
  done
  echo
  echo 'export default {'
  for family in $families; do
    if [ -f $family/$t ]; then
      echo '  '$family','
    fi
  done
  echo '};'
}

cd families

families=""
for f in *; do
  if [ -d $f ]; then
    families="$families $f"
  fi
done

for t in $targets; do
  out=../generated/$t
  if [[ "$out" != *.ts ]]; then
    out=$out.js
  fi
  genTarget $t > $out
done

# types

genDeviceTransactionConfig () {
  for family in $families; do
    if [ -f $family/deviceTransactionConfig.ts ]; then
      if grep -q "export type ExtraDeviceTransactionField" "$family/deviceTransactionConfig.ts"; then
        echo 'import type { ExtraDeviceTransactionField as ExtraDeviceTransactionField_'$family' } from "../families/'$family'/deviceTransactionConfig";'
      fi
    fi
  done

  echo 'export type ExtraDeviceTransactionField ='
  for family in $families; do
    if [ -f $family/deviceTransactionConfig.ts ]; then
      if grep -q "export type ExtraDeviceTransactionField" "$family/deviceTransactionConfig.ts"; then
        echo '| ExtraDeviceTransactionField_'$family
      fi
    fi
  done
}

genTypesFile () {
  echo '// @flow'
  for family in $families; do
    echo 'import { reflect as '$family'Reflect } from "../families/'$family'/types";'
    echo 'import type { CoreStatics as CoreStatics_'$family' } from "../families/'$family'/types";'
    echo 'import type { CoreAccountSpecifics as CoreAccountSpecifics_'$family' } from "../families/'$family'/types";'
    echo 'import type { CoreOperationSpecifics as CoreOperationSpecifics_'$family' } from "../families/'$family'/types";'
    echo 'import type { CoreCurrencySpecifics as CoreCurrencySpecifics_'$family' } from "../families/'$family'/types";'
    echo 'import type { Transaction as '$family'Transaction } from "../families/'$family'/types";'
    echo 'import type { TransactionRaw as '$family'TransactionRaw } from "../families/'$family'/types";'
    if [[ ! " ${withoutNetworkInfo[@]} " =~ " ${family} " ]]; then
      echo 'import type { NetworkInfo as '$family'NetworkInfo } from "../families/'$family'/types";'
      echo 'import type { NetworkInfoRaw as '$family'NetworkInfoRaw } from "../families/'$family'/types";'
    fi
  done
  echo
  echo 'export type SpecificStatics = {}'
  for family in $families; do
    echo '& CoreStatics_'$family
  done
  echo 'export type CoreAccountSpecifics = {}'
  for family in $families; do
    echo '& CoreAccountSpecifics_'$family
  done
  echo 'export type CoreOperationSpecifics = {}'
  for family in $families; do
    echo '& CoreOperationSpecifics_'$family
  done
  echo 'export type CoreCurrencySpecifics = {}'
  for family in $families; do
    echo '& CoreCurrencySpecifics_'$family
  done
  echo 'export type Transaction ='
  for family in $families; do
    echo '  | '$family'Transaction'
  done
  echo 'export type TransactionRaw ='
  for family in $families; do
    echo '  | '$family'TransactionRaw'
  done
  echo 'export type NetworkInfo ='
  for family in $families; do
    if [[ ! " ${withoutNetworkInfo[@]} " =~ " ${family} " ]]; then
      echo '  | '$family'NetworkInfo'
    fi
  done
  echo 'export type NetworkInfoRaw ='
  for family in $families; do
    if [[ ! " ${withoutNetworkInfo[@]} " =~ " ${family} " ]]; then
    echo '  | '$family'NetworkInfoRaw'
    fi
  done
  echo 'export const reflectSpecifics = (declare: *) => ['
  for family in $families; do
    echo '  '$family'Reflect(declare),'
  done
  echo '];'
}

genTypesFile > ../generated/types.ts

genDeviceTransactionConfig >> ../generated/deviceTransactionConfig.ts
