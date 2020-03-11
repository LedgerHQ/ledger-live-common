// @flow
import { fromAccountRaw } from "@ledgerhq/live-common/lib/account";

export const accountToSendSwap = (mock: boolean) => {
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
        derivationPath: "84'/0'/0'/0/1"
      },
      {
        address: "bc1qnzn79xkejceam32f0y22xjtzlzwj2znze7ppyk",
        derivationPath: "84'/0'/0'/0/2"
      }
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
      "xpub6D4xrRjfZp6bgGTfDHHjCFsS8E9LbXB3u4izJAwVxNSUoFugt4qd83zLywBrRooPzfWrcKLC1D7DipjECEEsRMCqhM2ptb5yKVmLgUnVGUs"
  });
};

export const accountToReceiveSwap = (mock: boolean) => {
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
        derivationPath: "49'/2'/0'/0/0"
      },
      {
        address: "MFoe3L1Ntjxf7biciDyv7iKvm4bAizUuf4",
        derivationPath: "49'/2'/0'/0/1"
      }
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
      "Ltub2YQy7ASMeb7PYatDvv1PfvukhDemVRDwXUN55z5rfMTaDztZFrn9iScxB8ZmGzpJSaNxKhva2FXVYaUjpZHQfpxJXqvAfJ4V6VLBtweH5ys"
  });
};
