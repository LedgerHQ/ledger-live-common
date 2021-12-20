import { CryptoCurrency } from "@ledgerhq/cryptoassets";
import { BehaviorSubject, Observable } from "rxjs";
import { SolanaPreloadDataV1 } from "./types";

const initialData: SolanaPreloadDataV1 = {
  version: "1",
  validators: [],
};

const dataByCurrency = new Map<string, SolanaPreloadDataV1>();

const dataUpdatesByCurrency = new Map([
  ["solana", new BehaviorSubject<SolanaPreloadDataV1>(initialData)],
  ["solana_testnet", new BehaviorSubject<SolanaPreloadDataV1>(initialData)],
  ["solana_devnet", new BehaviorSubject<SolanaPreloadDataV1>(initialData)],
]);

export function setData(
  data: SolanaPreloadDataV1,
  currency: CryptoCurrency
): void {
  dataByCurrency.set(currency.id, data);
  const subject = dataUpdatesByCurrency.get(currency.id);
  if (subject === undefined) {
    throw new Error(`unsupported currency ${currency.id}`);
  }
  subject.next(data);
}

export function getData(
  currency: CryptoCurrency
): Observable<SolanaPreloadDataV1> {
  const subject = dataUpdatesByCurrency.get(currency.id);
  if (subject === undefined) {
    throw new Error(`unsupported currency ${currency.id}`);
  }
  return subject.asObservable();
}
