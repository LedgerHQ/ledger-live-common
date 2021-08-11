// @flow
import { BigNumber } from 'bignumber.js'
import { fromTransactionRaw } from './transaction'

const dataset = {
  name: 'Platon 1',
  raw: {
    id: 'js:2:Platon:lat1224ealrarc9ue8khc4n4rmc7fkrdqvhl2r3xpk:',
    seedIdentifier:
      '048d65d4d7803363822c57d048fcf66c6e28e9892813527490cbc7edb3ba1b2e9731d8c9152e36ce92175d3da0611a5147aa9ddeba396827c371f7cc1324c276eb',
    name: 'Platon 1',
    starred: false,
    used: true,
    derivationMode: '',
    index: 0,
    freshAddress: 'lat1224ealrarc9ue8khc4n4rmc7fkrdqvhl2r3xpk',
    freshAddressPath: "44'/486'/0'/0/0",
    freshAddresses: [],
    blockHeight: '0x88a548',
    syncHash: '[]_0',
    creationDate: '2021-08-17T03:57:24.856Z',
    operationsCount: 14,
    operations: [],
    pendingOperations: [],
    currencyId: 'Platon',
    unitMagnitude: 18,
    lastSyncDate: '2021-08-17T03:57:24.829Z',
    balance: '9.999973727e+21',
    spendableBalance: '9.999973727e+21',
    balanceHistoryCache: {
      HOUR: { balances: [9.999973727e21], latestDate: 1629169200000 },
      DAY: { balances: [9.999973727e21], latestDate: 1629129600000 },
      WEEK: { balances: [9.999973727e21], latestDate: 1628956800000 },
    },
    subAccounts: [],
    swapHistory: [],
  },
  transactions: [
    {
      name: 'NO_NAME',
      transaction: fromTransactionRaw({
        amount: '2000000000000000',
        recipient: '0xc115ceadf9e5923330e5f42903fe7f926dda65d2',
        useAllAmount: false,
        mode: 'send',
        family: 'platon',
        gasPrice: '1000000000',
        userGasLimit: null,
        estimatedGasLimit: '21000',
        feeCustomUnit: { name: 'platon', code: 'LAT', magnitude: 18 },
        networkInfo: { family: 'platon', gasPrice: '1000000000' },
      }),
      expectedStatus: {
        errors: {},
        warnings: {},
        estimatedFees: BigNumber('21000000000000'),
        amount: BigNumber('2000000000000000'),
        totalSpent: BigNumber('2021000000000000'),
      },
      apdus: `
  => e004000040058000002c800001e6800000000000000000000000ea0d843b9aca0082520894c115ceadf9e5923330e5f42903fe7f926dda65d287071afd498d000080648080
  <= ec3ab5c6bb080c6923b068194ac733d1025f033ff97e58b216ddea29412fd35e4d16d6f6cdcd31bbfeb7d8b4bce7451283755d92a588b0d8de50aae63eb584e4159000
  `,
    },
  ],
}

export default dataset
