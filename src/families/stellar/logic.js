// @flow
import { BigNumber } from "bignumber.js";
import type { CacheRes } from "../../cache";
import { makeLRUCache } from "../../cache";
import type { Account } from "../../types";

import type { getSigners } from "../api";


// TODO: Move to cache
export const checkRecipientExist: CacheRes<
  Array<{ account: Account, recipient: string }>,
  boolean
> = makeLRUCache(
  async ({ recipient }) => await addressExists(recipient),
  (extract) => extract.recipient,
  { max: 300, maxAge: 5 * 60 } // 5 minutes
);

export const isMemoValid = (memoType: string, memoValue: string): boolean => {
  switch (memoType) {
    case "MEMO_TEXT":
      if (memoValue.length > 28) {
        return false;
      }
      break;

    case "MEMO_ID":
      if (BigNumber(memoValue.toString()).isNaN()) {
        return false;
      }
      break;

    case "MEMO_HASH":
    case "MEMO_RETURN":
      if (!memoValue.length || memoValue.length !== 32) {
        return false;
      }
      break;
  }
  return true;
};

export const isAccountMultiSign = async (account) => {
  const signers = await getSigners(account);

  return signers.length > 1;
};

/**
 * Returns true if address is valid, false if it's invalid (can't parse or wrong checksum)
 *
 * @param {*} address
 */
export const isAddressValid = (address: string): boolean => {
  if (!address) return false;
  try {
    // TODO: implement from SDK if available, or from libcore code below
    /*
      bool StellarLikeAddress::isValid(const std::string &address, const api::Currency& currency) {
          const auto &networkParams = currency.stellarLikeNetworkParameters.value();
          std::vector<uint8_t> bytes;
          try {
              BaseConverter::decode(address, BaseConverter::BASE32_RFC4648_NO_PADDING, bytes);
          } catch (...) {
              return false;
          }
          if (bytes.size() != (networkParams.Version.size() + PUBKEY_SIZE + CHECKSUM_SIZE) ||
              !std::equal(bytes.begin(), bytes.begin() + networkParams.Version.size(),
                          networkParams.Version.begin())) {
              return false;
          }
          BytesReader reader(bytes);
          auto payload = reader.read(networkParams.Version.size() + PUBKEY_SIZE);
          auto checksum = reader.readNextLeUint16();
          auto expectedChecksum = CRC::calculate(payload, CRC::XMODEM);
          return checksum == expectedChecksum;
      }
  */
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Checks if the current account exists on the stellar Network. If it doesn't the account needs
 * to be activated by sending an account creation operation with an amount of at least the base reserve.
 *
 * @param {*} address
 */
export const addressExists = async (address: string): boolean => {
  if (!address) return false;
  // TODO: implement from SDK if available, or from libcore code below
  /*
  Future<bool> StellarLikeWallet::exists(const std::string &address) {
    auto explorer = _params.blockchainExplorer;
    StellarLikeAddress addr(address, getCurrency(), Option<std::string>::NONE);
    return explorer->getAccount(address).map<bool>(getContext(), [] (const auto& result) {
        return true;
    }).recover(getContext(), [] (const Exception& ex) {
        if (ex.getErrorCode() == api::ErrorCode::ACCOUNT_NOT_FOUND)
            return false;
        throw ex;
    });
  }
  */
 return true;
}