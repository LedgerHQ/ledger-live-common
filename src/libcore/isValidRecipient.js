// @flow

import { InvalidAddress, RecipientRequired } from "@ledgerhq/errors";
import type { CryptoCurrency } from "../types";
import { withLibcoreF } from "./access";
import customAddressValidationByFamily from "../generated/customAddressValidation";

type F = ({
  currency: CryptoCurrency,
  recipient: string,
}) => Promise<?Error>;

export const isValidRecipient: F = withLibcoreF((core) => async (arg) => {
  const { currency, recipient } = arg;
  if (!recipient) {
    return Promise.reject(new RecipientRequired(""));
  }
  const custom = customAddressValidationByFamily[arg.currency.family];
  if (custom) {
    const res = await custom(core, arg);
    return res;
  }
  const walletStore = core.getWalletStore();
  const currencyCore = await walletStore.getCurrency(currency.id);
  const value = await core.Address.isValid(recipient, currencyCore);
  if (value) {
    return Promise.resolve(null);
  }

  return Promise.reject(
    new InvalidAddress(null, { currencyName: currency.name })
  );
});
