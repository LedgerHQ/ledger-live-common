// @flow

import { log } from "@ledgerhq/logs";
import { getLibcoreConfig, getDerivationScheme } from "../derivation";
import type { CryptoCurrency, DerivationMode } from "../types";
import { atomicQueue } from "../promise";
import type { Core, CoreWallet } from "./types";
import { findCurrencyExplorer } from "../api/Ledger";
import { getEnv } from "../env";
import { isNonExistingWalletError } from "./errors";

type F = ({
  core: Core,
  walletName: string,
  currency: CryptoCurrency,
  derivationMode: DerivationMode,
}) => Promise<CoreWallet>;

const preventSyncToken = {
  // infinite loop issue.
  tezos: true,
};

export const getOrCreateWallet: F = atomicQueue(
  async ({ core, walletName, currency, derivationMode }) => {
    const poolInstance = core.getPoolInstance();
    let wallet;

    const config = await core.DynamicObject.newInstance();

    const configExtra = getLibcoreConfig(currency, derivationMode);
    if (configExtra) {
      for (let k in configExtra) {
        const v = configExtra[k];
        if (typeof v === "string") {
          await config.putString(k, v);
        }
      }
    }

    const derivationScheme = getDerivationScheme({ currency, derivationMode });
    await config.putString("KEYCHAIN_DERIVATION_SCHEME", derivationScheme);
    if (!preventSyncToken[currency.id]) {
      await config.putBoolean(
        "DEACTIVATE_SYNC_TOKEN",
        getEnv("DISABLE_SYNC_TOKEN")
      );
    }

    const KEYCHAIN_OBSERVABLE_RANGE = getEnv("KEYCHAIN_OBSERVABLE_RANGE");
    if (KEYCHAIN_OBSERVABLE_RANGE) {
      await config.putInt(
        "KEYCHAIN_OBSERVABLE_RANGE",
        KEYCHAIN_OBSERVABLE_RANGE
      );
    }

    const ledgerExplorer = findCurrencyExplorer(currency);
    if (ledgerExplorer) {
      const endpoint = ledgerExplorer.endpoint;
      if (endpoint) {
        await config.putString("BLOCKCHAIN_EXPLORER_API_ENDPOINT", endpoint);
      }
      await config.putString(
        "BLOCKCHAIN_EXPLORER_VERSION",
        ledgerExplorer.version
      );
    }

    log("libcore", "getOrCreateWallet " + walletName);
    try {
      // check if wallet exists yet
      wallet = await poolInstance.getWallet(walletName);
    } catch (err) {
      if (!isNonExistingWalletError(err)) {
        throw err;
      }
      // create it with the config
      const currencyCore = await poolInstance.getCurrency(currency.id);
      wallet = await poolInstance.createWallet(
        walletName,
        currencyCore,
        config
      );
      return wallet;
    }

    // if it existed, we still need to sync again the config in case it changed
    await poolInstance.updateWalletConfig(walletName, config);
    // and we need to get wallet again to have this config taken into account
    wallet = await poolInstance.getWallet(walletName);
    return wallet;
  },
  ({ walletName }: { walletName: string }) => walletName
);
