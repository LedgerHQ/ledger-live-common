// @flow
import { fromAccountRaw } from "@ledgerhq/live-common/lib/account";

export const account1 = (mock: boolean) => {
  const id = `${
    mock ? "mock" : "libcore"
  }:1:bitcoin:xpub6D4xrRjfZp6bgGTfDHHjCFsS8E9LbXB3u4izJAwVxNSUoFugt4qd83zLywBrRooPzfWrcKLC1D7DipjECEEsRMCqhM2ptb5yKVmLgUnVGUs:native_segwit`;

  return fromAccountRaw({
    id,
    seedIdentifier:
      "0432bdb627888a585281a23ba94bc2e556874b0d6f02be854b80486a2e87e9e30200d24f9587530853d2c9a70851793ed031ea2b09ffdaf23e8b2643ca3d5f127c",
    name: "Bitcoin 1 (native segwit)",
    starred: false,
    derivationMode: "native_segwit",
    index: 0,
    freshAddress: "bc1qnnv9ekuj5jk3c4fs5n0dsjd4l9qs6aslmh844q",
    freshAddressPath: "84'/0'/0'/0/1",
    freshAddresses: [
      {
        address: "bc1qnnv9ekuj5jk3c4fs5n0dsjd4l9qs6aslmh844q",
        derivationPath: "84'/0'/0'/0/1",
      },
      {
        address: "bc1qnzn79xkejceam32f0y22xjtzlzwj2znze7ppyk",
        derivationPath: "84'/0'/0'/0/2",
      },
    ],
    blockHeight: 618200,
    operationsCount: 2,
    operations: [],
    pendingOperations: [],
    currencyId: "bitcoin",
    unitMagnitude: 8,
    lastSyncDate: "2020-02-20T11:12:00.087Z",
    balance: "1040000",
    balanceHistory: {},
    spendableBalance: "1040000",
    xpub:
      "xpub6D4xrRjfZp6bgGTfDHHjCFsS8E9LbXB3u4izJAwVxNSUoFugt4qd83zLywBrRooPzfWrcKLC1D7DipjECEEsRMCqhM2ptb5yKVmLgUnVGUs",
  });
};

export const account2 = (mock: boolean) => {
  const id = `${
    mock ? "mock" : "libcore"
  }:1:litecoin:Ltub2YQy7ASMeb7PYatDvv1PfvukhDemVRDwXUN55z5rfMTaDztZFrn9iScxB8ZmGzpJSaNxKhva2FXVYaUjpZHQfpxJXqvAfJ4V6VLBtweH5ys:segwit`;

  return fromAccountRaw({
    id,
    seedIdentifier:
      "04544b4e22f413ea50a9b506663fcefa72d14e18405f93f83e7aa2b56d429fd2d97f10e474b0245e071d378097709403fb2f043d7232b81aa6dd916c5b551ad377",
    name: "Litecoin 1 (segwit)",
    starred: false,
    derivationMode: "segwit",
    index: 0,
    freshAddress: "MQ7mSEeL8zcghLxVhKcgkH4BYmQ1vNgSH1",
    freshAddressPath: "49'/2'/0'/0/0",
    freshAddresses: [
      {
        address: "MQ7mSEeL8zcghLxVhKcgkH4BYmQ1vNgSH1",
        derivationPath: "49'/2'/0'/0/0",
      },
      {
        address: "MFoe3L1Ntjxf7biciDyv7iKvm4bAizUuf4",
        derivationPath: "49'/2'/0'/0/1",
      },
    ],
    blockHeight: 1797200,
    operationsCount: 0,
    operations: [],
    pendingOperations: [],
    currencyId: "litecoin",
    unitMagnitude: 8,
    lastSyncDate: "2020-02-28T11:31:51.356Z",
    balance: "0",
    spendableBalance: "0",
    balanceHistory: {},
    xpub:
      "Ltub2YQy7ASMeb7PYatDvv1PfvukhDemVRDwXUN55z5rfMTaDztZFrn9iScxB8ZmGzpJSaNxKhva2FXVYaUjpZHQfpxJXqvAfJ4V6VLBtweH5ys",
  });
};

export const account11 = (mock: boolean) => {
  const id = `${
    mock ? "mock" : "libcore"
  }:1:bitcoin:xpub6DACJs4ZgE67HEu53j2osRtw51wfJybJ88ccVQnHpmjqr9XJfMYXn6Fxt3u772FonuWfqYUrb9Z9wxe2S9pTzxGDiQZDk1cMPiDH2S5HjYa:native_segwit`;

  return fromAccountRaw({
    id,
    seedIdentifier:
      "04c34029090f64a127ed5abc5b46a4ac51d14256e121adfe65eade766c3a45d5112e480268ee3f9102d0e839b4656f0c2777a4bbeaf16054d6271f628fc99bd5af",
    name: "Bitcoin 1 (native segwit)",
    starred: false,
    derivationMode: "native_segwit",
    index: 0,
    freshAddress: "bc1qvg99u703myneyq5yavq7t83zjfgce8fnq4shsw",
    freshAddressPath: "84'/0'/0'/0/1",
    freshAddresses: [],
    blockHeight: 632733,
    operationsCount: 1,
    operations: [
      {
        id:
          "libcore:1:bitcoin:xpub6DACJs4ZgE67HEu53j2osRtw51wfJybJ88ccVQnHpmjqr9XJfMYXn6Fxt3u772FonuWfqYUrb9Z9wxe2S9pTzxGDiQZDk1cMPiDH2S5HjYa:native_segwit-1e9c76c11777326aea0d1205c56829d1765845681e84e9a4e23fdf6d450a5680-IN",
        type: "IN",
        senders: [
          "bc1q9uduya6t0l44jfmu0cm8420qxhhfdwj53c00le",
          "bc1q73c7hew54kx9qcqnxyexs6k2q6n2jg7dsxqftz",
        ],
        recipients: [
          "bc1qukfggtdcqdlejppmak5vu99aatk234pu7l32ga",
          "bc1q9euthmreev0ymp8r32ytmnvxfd0xee8kzaz9ph",
        ],
        blockHeight: 632731,
        blockHash: null,
        accountId:
          "libcore:1:bitcoin:xpub6DACJs4ZgE67HEu53j2osRtw51wfJybJ88ccVQnHpmjqr9XJfMYXn6Fxt3u772FonuWfqYUrb9Z9wxe2S9pTzxGDiQZDk1cMPiDH2S5HjYa:native_segwit",
        extra: {},
        hash:
          "1e9c76c11777326aea0d1205c56829d1765845681e84e9a4e23fdf6d450a5680",
        date: "2020-06-02T10:26:30.000Z",
        value: "1000000",
        fee: "14124",
      },
    ],
    pendingOperations: [],
    currencyId: "bitcoin",
    unitMagnitude: 8,
    lastSyncDate: "2020-06-02T11:31:36.921Z",
    balance: "1000000",
    spendableBalance: "1000000",
    balanceHistory: {},
    xpub:
      "xpub6DACJs4ZgE67HEu53j2osRtw51wfJybJ88ccVQnHpmjqr9XJfMYXn6Fxt3u772FonuWfqYUrb9Z9wxe2S9pTzxGDiQZDk1cMPiDH2S5HjYa",
  });
};

export const account12 = (mock: boolean) => {
  const id = `${
    mock ? "mock" : "libcore"
  }:1:litecoin:Ltub2Zx1tbqWB7AbC4fb7aWgsuyXBm2qt97gzG5av4PHAjdAhvdZQFHS7nmcScgtAvpgcGAkVQQvR9BXwu54ny6Yqwst4KQAnyD1Yx6VezNf1S8:segwit`;

  return fromAccountRaw({
    id,
    seedIdentifier:
      "04f0e0c596eda440b4110082147d96a316c25c2e6be47fe7325c299038328161c788ba804a297b4761587db7700b6934b1d32e9c7d407303cba816c35e83767366",
    name: "Litecoin 1 (segwit)",
    starred: false,
    derivationMode: "segwit",
    index: 0,
    freshAddress: "MBAwXMFChGe9riqkaind1fa459awc3GLG7",
    freshAddressPath: "49'/2'/0'/0/0",
    freshAddresses: [],
    blockHeight: 1852468,
    operationsCount: 0,
    operations: [],
    pendingOperations: [],
    currencyId: "litecoin",
    unitMagnitude: 8,
    lastSyncDate: "2020-06-02T11:36:48.827Z",
    balance: "0",
    spendableBalance: "0",
    balanceHistory: {},
    xpub:
      "Ltub2Zx1tbqWB7AbC4fb7aWgsuyXBm2qt97gzG5av4PHAjdAhvdZQFHS7nmcScgtAvpgcGAkVQQvR9BXwu54ny6Yqwst4KQAnyD1Yx6VezNf1S8",
  });
};
