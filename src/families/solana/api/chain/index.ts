import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Cluster,
  clusterApiUrl,
  Connection,
  PublicKey,
  SignaturesForAddressOptions,
} from "@solana/web3.js";

export type Config = {
  readonly cluster: Cluster;
};

const connector = () => {
  const connections = new Map<Cluster, Connection>();

  return (cluster: Cluster) => {
    const existingConnection = connections.get(cluster);
    if (existingConnection !== undefined) {
      return existingConnection;
    }
    const newConnection = new Connection(clusterApiUrl(cluster));
    connections.set(cluster, newConnection);
    return newConnection;
  };
};

export function getChainAPI(config: Config) {
  const connection = new Connection(clusterApiUrl(config.cluster), "finalized");

  return {
    getBalance: (address: string) =>
      connection.getBalance(new PublicKey(address)),

    getRecentBlockhash: () => connection.getRecentBlockhash(),

    getBalanceAndContext: (address: string) =>
      connection.getBalanceAndContext(new PublicKey(address)),

    getParsedTokenAccountsByOwner: (address: string) =>
      connection.getParsedTokenAccountsByOwner(new PublicKey(address), {
        programId: TOKEN_PROGRAM_ID,
      }),
    getSignaturesForAddress: (
      address: string,
      opts?: SignaturesForAddressOptions
    ) => connection.getSignaturesForAddress(new PublicKey(address), opts),

    getParsedConfirmedTransactions: (signatures: string[]) =>
      connection.getParsedConfirmedTransactions(signatures),

    getAccountInfo: (address: string) =>
      connection
        .getParsedAccountInfo(new PublicKey(address))
        .then((r) => r.value),

    sendRawTransaction: (buffer: Buffer) =>
      connection.sendRawTransaction(buffer),

    findAssocTokenAccAddress: (owner: string, mint: string) =>
      Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        new PublicKey(mint),
        new PublicKey(owner)
      ).then((r) => r.toBase58()),

    getAssocTokenAccMinNativeBalance: () =>
      Token.getMinBalanceRentForExemptAccount(connection),

    config,
  };
}

// TODO: make readonly!
export type ChainAPI = ReturnType<typeof getChainAPI>;
