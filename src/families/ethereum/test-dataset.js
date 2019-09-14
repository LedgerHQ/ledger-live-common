// @flow
import type { DatasetTest } from "../dataset";

const dataset: DatasetTest = {
  implementations: ["libcore", "mock", "ethereumjs"],
  currencies: {
    ethereum: {
      recipients: [
        {
          address: "0x17733CAb76d9A2112576443F21735789733B1ca3",
          isValid: true
        },
        {
          address: "0x519192a437e6aeb895Cec72828A73B11b698dE3a",
          isValid: true
        }
      ],
      accounts: [
        {
          raw: {
            id:
              "libcore:1:ethereum:xpub6BemYiVNp19ZzH73tAbE9guoQcyygwpWgmrch2J2WsbJhxUSnjZXpMnAKru6wXK3AWxU2fywYBCdojmwnFL6qiH3ByqXpDJ2PKGijdaNvAb:",
            seedIdentifier:
              "046575fa4cc4274a90599226af2493b8bdaf978674dc777bac4c3ef1667792d7339ef42ce783c0c4d83306720015473897508ef6029e7400869ea515526f4394c9",
            name: "Ethereum 1",
            derivationMode: "",
            index: 0,
            freshAddress: "0x519192a437e6aeb895Cec72828A73B11b698dE3a",
            freshAddressPath: "44'/60'/0'/0/0",
            pendingOperations: [],
            currencyId: "ethereum",
            unitMagnitude: 18,
            balance: "48167391707119",
            xpub:
              "xpub6BemYiVNp19ZzH73tAbE9guoQcyygwpWgmrch2J2WsbJhxUSnjZXpMnAKru6wXK3AWxU2fywYBCdojmwnFL6qiH3ByqXpDJ2PKGijdaNvAb",
            tokenAccounts: [],
            operations: [],
            freshAddresses: [
              {
                address: "0x519192a437e6aeb895Cec72828A73B11b698dE3a",
                derivationPath: "44'/60'/0'/0/0"
              }
            ],
            lastSyncDate: "",
            blockHeight: 0
          }
        },
        {
          raw: {
            id:
              "libcore:1:ethereum:xpub6BemYiVNp19a1XgWqLcpWd1pBDZTgzPEcVvhR15cpXPVQjuEnrU7fa3TUatX2NbRWNkqx51jmyukisqGokHq5dyK5uYcbwQBF7nJyAdpYZy:",
            seedIdentifier:
              "xpub6BemYiVNp19a1XgWqLcpWd1pBDZTgzPEcVvhR15cpXPVQjuEnrU7fa3TUatX2NbRWNkqx51jmyukisqGokHq5dyK5uYcbwQBF7nJyAdpYZy",
            name: "Ethereum legacy xpub6Bem...JyAdpYZy",
            derivationMode: "",
            index: 0,
            freshAddress: "0x0E3F0bb9516F01f2C34c25E0957518b8aC9414c5",
            freshAddressPath: "44'/60'/0'/0/0",
            freshAddresses: [],
            pendingOperations: [],
            operations: [],
            currencyId: "ethereum",
            unitMagnitude: 18,
            balance: "",
            blockHeight: 0,
            lastSyncDate: "",
            xpub:
              "xpub6BemYiVNp19a1XgWqLcpWd1pBDZTgzPEcVvhR15cpXPVQjuEnrU7fa3TUatX2NbRWNkqx51jmyukisqGokHq5dyK5uYcbwQBF7nJyAdpYZy"
          }
        }
      ]
    }
  }
};

export default dataset;
