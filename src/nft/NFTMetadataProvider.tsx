import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import { Currency, findCryptoCurrencyById } from "@ledgerhq/cryptoassets";
import { API, apiForCurrency } from "../api/Ethereum";
import { NFTMetadata } from "../types";

const currency: Currency = findCryptoCurrencyById("ethereum")!;
const ethApi: API = apiForCurrency(currency);

type NFTResourceQueued = {
  status: "queued";
};

type NFTResourceLoading = {
  status: "loading";
};

type NFTResourceLoaded = {
  status: "loaded";
  metadata: NFTMetadata;
  updatedAt: number;
};

type NFTResourceError = {
  status: "error";
  error: any;
  updatedAt: number;
};

type NFTResourceNoData = {
  status: "nodata";
};

type NFTResource =
  | NFTResourceQueued
  | NFTResourceLoading
  | NFTResourceLoaded
  | NFTResourceError
  | NFTResourceNoData;

type NFTMetadataContextState = {
  cache: Record<string, NFTResource>;
};

type NFTMetadataContextAPI = {
  loadNFTMetadata: (contract: string, tokenId: string) => Promise<void>;
  clearCache: () => void;
};

export type NFTMetadataContextType = NFTMetadataContextState &
  NFTMetadataContextAPI;

const NFTMetadataContext = createContext<NFTMetadataContextType>({
  cache: {},
  loadNFTMetadata: () => Promise.resolve(),
  clearCache: () => {},
});

function getNFTId(contract: string, tokenId: string) {
  return `${contract}-${tokenId}`;
}

export function useNFTMetadata(contract: string, tokenId: string): NFTResource {
  const { cache, loadNFTMetadata } = useContext(NFTMetadataContext);

  const id = getNFTId(contract, tokenId);

  const cached = cache[id];

  useEffect(() => {
    if (!cached) {
      loadNFTMetadata(contract, tokenId);
    }
  }, [contract, tokenId, cached, loadNFTMetadata]);

  if (cached) {
    return cached;
  } else {
    return {
      status: "queued",
    };
  }
}

type NFTMetadataProviderProps = {
  children: React.ReactNode;
};

export function NFTMetadataProvider({ children }: NFTMetadataProviderProps) {
  const [state, setState] = useState<NFTMetadataContextState>({
    cache: {},
  });

  const api = useMemo(
    () => ({
      loadNFTMetadata: async (contract: string, tokenId: string) => {
        const id = getNFTId(contract, tokenId);

        setState((oldState) => ({
          ...oldState,
          cache: {
            ...oldState.cache,
            [id]: {
              status: "loading",
            },
          },
        }));

        try {
          const [metadata] = await ethApi.getNFTMetadata([
            { contract, tokenId },
          ]);

          setState((oldState) => ({
            ...oldState,
            cache: {
              ...oldState.cache,
              [id]: {
                status: "loaded",
                metadata,
                updatedAt: Date.now(),
              },
            },
          }));
        } catch (error) {
          setState((oldState) => ({
            ...oldState,
            cache: {
              ...oldState.cache,
              [id]: {
                status: "error",
                error,
                updatedAt: Date.now(),
              },
            },
          }));
        }
      },
      clearCache: () => {
        setState((oldState) => ({
          ...oldState,
          cache: {},
        }));
      },
    }),
    []
  );
  const value = { ...state, ...api };
  return (
    <NFTMetadataContext.Provider value={value}>
      {children}
    </NFTMetadataContext.Provider>
  );
}
