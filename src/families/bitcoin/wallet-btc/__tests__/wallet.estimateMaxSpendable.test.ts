import { DerivationModes } from '../types';
import WalletLedger from '../wallet';
import * as utils from '../utils';
import { Account } from '../account';
import MockBtc from './mocks/Btc';

describe('testing estimateMaxSpendable', () => {
  const wallet = new WalletLedger();
  let account: Account;
  it('should generate an account', async () => {
    account = await wallet.generateAccount({
      btc: new MockBtc(),
      path: "44'/0'",
      index: 0,
      currency: 'bitcoin',
      network: 'mainnet',
      derivationMode: DerivationModes.LEGACY,
      explorer: 'ledgerv3',
      explorerURI: 'https://explorers.api.vault.ledger.com/blockchain/v3/btc',
      storage: 'mock',
      storageParams: [],
    });

    expect(account.xpub.xpub).toEqual(
      'xpub6CV2NfQJYxHn7MbSQjQip3JMjTZGUbeoKz5xqkBftSZZPc7ssVPdjKrgh6N8U1zoQDxtSo6jLarYAQahpd35SJoUKokfqf1DZgdJWZhSMqP'
    );
  });

  it('should estimate max spendable correctly', async () => {
    await wallet.syncAccount(account);
    let maxSpendable = await wallet.estimateAccountMaxSpendable(account, 0);
    const balance = 109088;
    expect(maxSpendable.toNumber()).toEqual(balance);
    let feesPerByte = 100;
    maxSpendable = await wallet.estimateAccountMaxSpendable(account, feesPerByte);
    expect(maxSpendable.toNumber()).toEqual(
      balance - feesPerByte * utils.estimateTxSize(2, 1, account.xpub.crypto, account.xpub.derivationMode)
    );
    feesPerByte = 10000;
    maxSpendable = await wallet.estimateAccountMaxSpendable(account, feesPerByte);
    expect(maxSpendable.toNumber()).toEqual(0);
  }, 60000);
});
