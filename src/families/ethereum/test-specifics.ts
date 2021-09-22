import "../../__tests__/test-helpers/setup";
import sortBy from "lodash/sortBy";
import axios from "axios";
import { reduce } from "rxjs/operators";
import { fromAccountRaw } from "../../account";
import { getAccountBridge } from "../../bridge";
import { makeBridgeCacheSystem } from "../../bridge/cache";
import { AccountRaw } from "../../types";

const accountFactory = (address: string): AccountRaw => ({
  id: `js:1:ethereum:${address}:`,
  seedIdentifier: address,
  name: "Ethereum legacy xpub6Bem...JyAdpYZy",
  derivationMode: "",
  index: 0,
  freshAddress: address,
  freshAddressPath: "44'/60'/0'/0/0",
  freshAddresses: [],
  pendingOperations: [],
  operations: [],
  currencyId: "ethereum",
  unitMagnitude: 18,
  balance: "",
  blockHeight: 0,
  lastSyncDate: "",
  xpub: "",
});

const nftAccounts: AccountRaw[] = [
  "0x689c61783100654dc72f2825b8e6050ee65a5419",
  "0x053a031856b23a823b71e032c92b1599ac1cc3f2",
  "0x68db7d679969f265b14ba8a495e4028360ad6759",
].map(accountFactory);

export default (): void => {
  describe("Ethereum NFT tests", () => {
    test.each(nftAccounts)(
      "shoud have the same amount of nfts than OpenSea's response",
      async (nftAccount) => {
        const account = fromAccountRaw(nftAccount);
        const localCache = {};
        const cache = makeBridgeCacheSystem({
          saveData(c, d) {
            localCache[c.id] = d;
            return Promise.resolve();
          },

          getData(c) {
            return Promise.resolve(localCache[c.id]);
          },
        });
        await cache.prepareCurrency(account.currency);
        const bridge = getAccountBridge(account);
        const blacklistedTokenIds = ["ethereum/erc20/weth"];
        const synced = await bridge
          .sync(account, {
            paginationConfig: {},
            blacklistedTokenIds,
          })
          .pipe(reduce((a, f) => f(a), account))
          .toPromise();

        const getPaginatedOpenSeaRes = async (assets = []) => {
          const { data } = await axios.get(
            `https://api.opensea.io/api/v1/assets?offset=${assets.length}&limit=50&owner=${nftAccount.freshAddress}`
          );

          assets.push(...((data?.assets ?? []) as []));

          if (data?.assets?.length === 50) {
            await getPaginatedOpenSeaRes(assets);
          }

          return assets;
        };

        const openSeaList: any = await getPaginatedOpenSeaRes().then(
          (assets: any) =>
            // removes lazy minting from open sea
            assets
              ?.filter(
                (a) =>
                  !(
                    a?.is_presale &&
                    a?.num_sales === 0 &&
                    a?.creator?.address === nftAccount.freshAddress
                  )
              )
              .map((n) => ({
                contract: n.asset_contract.address,
                tokenId: n.token_id,
              }))
        );

        const ourList =
          synced.nfts?.map((n) => ({
            contract: n.collection.contract,
            tokenId: n.tokenId,
          })) || [];

        expect(ourList?.length).toEqual(openSeaList?.length);
        expect(sortBy(openSeaList, ["contract", "tokenId"])).toEqual(
          sortBy(ourList, ["contract", "tokenId"])
        );
      }
    );
  });
};
