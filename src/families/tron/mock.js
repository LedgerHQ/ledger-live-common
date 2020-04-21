// @flow
import { fromAccountRaw } from "../../account/serialization";

export const __NEXT_REWARD_DATE__ = new Date(Date.now() - 6 * 60 * 60 * 1000);

export const __LAST_VOTING_DATE__ = new Date(Date.now() - 6 * 60 * 60 * 1000);

export const mockAccount = fromAccountRaw({
  type: "Account",
  id: "js:2:tron:TRON_ID:",
  starred: true,
  seedIdentifier: "TRON_ID",
  derivationMode: "",
  index: 0,
  freshAddress: "TRON_ID",
  freshAddressPath: "44'/195'/0'/0/0",
  freshAddresses: [
    {
      address: "TRON_ID",
      derivationPath: "44'/195'/0'/0/0"
    }
  ],
  name: "Tron 1",
  blockHeight: 0,
  balance: "375978130",
  balanceHistory: {},
  spendableBalance: "978130",
  operations: [
    {
      id:
        "js:2:tron:TRON_ID:-fefcdb155a958d3710e82bc2434c69e121ca20b01ab26d09018680243076f8b1-REWARD",
      hash: "fefcdb155a958d3710e82bc2434c69e121ca20b01ab26d09018680243076f8b1",
      type: "REWARD",
      blockHeight: 18087080,
      blockHash: null,
      accountId: "js:2:tron:TRON_ID:",
      senders: ["TRON_ID"],
      recipients: [],
      date: __NEXT_REWARD_DATE__.toISOString(),
      value: "622168",
      fee: "0",
      extra: {},
      subOperations: []
    },
    {
      id:
        "js:2:tron:TRON_ID:-441d1901895a5f14a4f1cd71bf888b7ef4296d1b7fbfef35cf98722310b14227-FREEZE",
      hash: "441d1901895a5f14a4f1cd71bf888b7ef4296d1b7fbfef35cf98722310b14227",
      type: "FREEZE",
      blockHeight: 18060743,
      blockHash: null,
      accountId: "js:2:tron:TRON_ID:",
      senders: ["TRON_ID"],
      recipients: [],
      date: "2020-03-17T11:23:12.000Z",
      value: "0",
      fee: "0",
      extra: { frozenAmount: "1000000", resource: "BANDWIDTH" },
      subOperations: []
    },
    {
      id:
        "js:2:tron:TRON_ID:-b7dd2c553fefc666cc16df7d29af48ce6ab128a888cbcf6d1236900d3c4c4211-REWARD",
      hash: "b7dd2c553fefc666cc16df7d29af48ce6ab128a888cbcf6d1236900d3c4c4211",
      type: "REWARD",
      blockHeight: 17913629,
      blockHash: null,
      accountId: "js:2:tron:TRON_ID:",
      senders: ["TRON_ID"],
      recipients: [],
      date: "2020-03-12T08:41:33.000Z",
      value: "98952",
      fee: "0",
      extra: {},
      subOperations: []
    },
    {
      id:
        "js:2:tron:TRON_ID:-cb8966713bb58a6e88d628b1a9d2cdc3729972054d4c390c72eb64d79dd739e8-REWARD",
      hash: "cb8966713bb58a6e88d628b1a9d2cdc3729972054d4c390c72eb64d79dd739e8",
      type: "REWARD",
      blockHeight: 17863608,
      blockHash: null,
      accountId: "js:2:tron:TRON_ID:",
      senders: ["TRON_ID"],
      recipients: [],
      date: "2020-03-10T14:59:21.000Z",
      value: "1187199",
      fee: "0",
      extra: {},
      subOperations: []
    },
    {
      id:
        "js:2:tron:TRON_ID:-fa1186af55003febff74130508e66560b7f09de7dde30b7bf67f670678c0c58b-VOTE",
      hash: "fa1186af55003febff74130508e66560b7f09de7dde30b7bf67f670678c0c58b",
      type: "VOTE",
      blockHeight: 17827337,
      blockHash: null,
      accountId: "js:2:tron:TRON_ID:",
      senders: ["TRON_ID"],
      recipients: [],
      date: __LAST_VOTING_DATE__.toISOString(),
      value: "0",
      fee: "0",
      extra: {
        votes: [
          { address: "TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH", count: 281 },
          { address: "TGj1Ej1qRzL9feLTLhjwgxXF4Ct6GTWg2U", count: 55 }
        ]
      },
      subOperations: []
    },
    {
      id:
        "js:2:tron:TRON_ID:-c2723b0b9a795acda68b159ce90dd665b1ec487e54bec8372934ee6aed5a18ad-OUT",
      hash: "c2723b0b9a795acda68b159ce90dd665b1ec487e54bec8372934ee6aed5a18ad",
      type: "OUT",
      blockHeight: 17633222,
      blockHash: null,
      accountId: "js:2:tron:TRON_ID:",
      senders: ["TRON_ID"],
      recipients: ["TX1gEuaqbsC8KbtMk2SonU2EC4Krh1Cbsy"],
      date: "2020-03-02T14:54:48.000Z",
      value: "700000",
      fee: "0",
      extra: {},
      subOperations: []
    },
    {
      id:
        "js:2:tron:TRON_ID:-88a4fd5ecd8590abdfa4c769e7127b4dcbf7c6d79d8b40d222a2d2629ec63742-VOTE",
      hash: "88a4fd5ecd8590abdfa4c769e7127b4dcbf7c6d79d8b40d222a2d2629ec63742",
      type: "VOTE",
      blockHeight: 17320353,
      blockHash: null,
      accountId: "js:2:tron:TRON_ID:",
      senders: ["TRON_ID"],
      recipients: [],
      date: "2020-02-20T17:32:57.000Z",
      value: "0",
      fee: "0",
      extra: {
        votes: [
          { address: "TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH", count: 300 },
          { address: "TGj1Ej1qRzL9feLTLhjwgxXF4Ct6GTWg2U", count: 74 }
        ]
      },
      subOperations: []
    },
    {
      id:
        "js:2:tron:TRON_ID:-298cb0f9f53290cb7f535be01ef554dec46c4b7ba7d85e7e45562c33d9a0af68-FREEZE",
      hash: "298cb0f9f53290cb7f535be01ef554dec46c4b7ba7d85e7e45562c33d9a0af68",
      type: "FREEZE",
      blockHeight: 17262379,
      blockHash: null,
      accountId: "js:2:tron:TRON_ID:",
      senders: ["TRON_ID"],
      recipients: [],
      date: "2020-02-18T17:13:03.000Z",
      value: "0",
      fee: "0",
      extra: { frozenAmount: "374000000", resource: "BANDWIDTH" },
      subOperations: []
    },
    {
      id:
        "js:2:tron:TRON_ID:-fa2fead8eb4789dfea70dca40fbf15878d39f58a52d583fddd80748081475a78-IN",
      hash: "fa2fead8eb4789dfea70dca40fbf15878d39f58a52d583fddd80748081475a78",
      type: "IN",
      blockHeight: 17087079,
      blockHash: null,
      accountId: "js:2:tron:TRON_ID:",
      senders: ["TXufMKjStJkxYqgrmBXL7NNs8nWNEoFZvd"],
      recipients: ["TRON_ID"],
      date: "2020-02-12T15:02:36.000Z",
      value: "50000000",
      fee: "0",
      extra: {},
      subOperations: []
    },
    {
      id:
        "js:2:tron:TRON_ID:-0f7c86c52e123103a1dd4ad46f2b91084557d46303b8b67f46341cc3be1b9928-OUT",
      hash: "0f7c86c52e123103a1dd4ad46f2b91084557d46303b8b67f46341cc3be1b9928",
      type: "OUT",
      blockHeight: 17087029,
      blockHash: null,
      accountId: "js:2:tron:TRON_ID:",
      senders: ["TRON_ID"],
      recipients: ["TXufMKjStJkxYqgrmBXL7NNs8nWNEoFZvd"],
      date: "2020-02-12T15:00:06.000Z",
      value: "50000000",
      fee: "0",
      extra: {},
      subOperations: []
    },
    {
      id:
        "js:2:tron:TRON_ID:-b115f066a969972efcb229d657e9ae776ef413dab89a3ce9e85db46f8c378dc9-IN",
      hash: "b115f066a969972efcb229d657e9ae776ef413dab89a3ce9e85db46f8c378dc9",
      type: "IN",
      blockHeight: 17086991,
      blockHash: null,
      accountId: "js:2:tron:TRON_ID:",
      senders: ["TXufMKjStJkxYqgrmBXL7NNs8nWNEoFZvd"],
      recipients: ["TRON_ID"],
      date: "2020-02-12T14:58:12.000Z",
      value: "364769811",
      fee: "0",
      extra: {},
      subOperations: []
    },
    {
      id:
        "js:2:tron:TRON_ID:-f777ab64d5b80408e46563f476604e997033afce0b0f1e5d315bf92603548dcb-IN",
      hash: "f777ab64d5b80408e46563f476604e997033afce0b0f1e5d315bf92603548dcb",
      type: "IN",
      blockHeight: 17086819,
      blockHash: null,
      accountId: "js:2:tron:TRON_ID:",
      senders: ["TXufMKjStJkxYqgrmBXL7NNs8nWNEoFZvd"],
      recipients: ["TRON_ID"],
      date: "2020-02-12T14:49:36.000Z",
      value: "10000000",
      fee: "100000",
      extra: {},
      subOperations: []
    }
  ],
  operationsCount: 12,
  pendingOperations: [],
  unit: { name: "TRX", code: "TRX", magnitude: 6 },
  currencyId: "tron",
  unitMagnitude: 6,
  lastSyncDate: "2020-03-18T09:22:46.747Z",
  subAccounts: [],
  tronResources: {
    frozen: {
      bandwidth: {
        amount: "375000000",
        expiredAt: "2020-03-20T11:23:09.000Z"
      },
      energy: null
    },
    delegatedFrozen: { bandwidth: null, energy: null },
    delegatedResources: [],
    votes: [
      { address: "TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH", voteCount: 281 },
      { address: "TGj1Ej1qRzL9feLTLhjwgxXF4Ct6GTWg2U", voteCount: 55 }
    ],
    tronPower: 375,
    energy: "0",
    bandwidth: {
      freeUsed: "0",
      freeLimit: "5000",
      gainedUsed: "201",
      gainedLimit: "679"
    },
    unwithdrawnReward: "13602",
    lastWithdrawnRewardDate: __NEXT_REWARD_DATE__.toISOString(),
    lastVotedDate: __LAST_VOTING_DATE__.toISOString()
  }
});

export const mockAccountNoReward = fromAccountRaw({
  type: "Account",
  id: "js:2:tron:TRON_ID:",
  starred: true,
  seedIdentifier: "TRON_ID",
  derivationMode: "",
  index: 0,
  freshAddress: "TRON_ID",
  freshAddressPath: "44'/195'/0'/0/0",
  freshAddresses: [
    {
      address: "TRON_ID",
      derivationPath: "44'/195'/0'/0/0"
    }
  ],
  name: "Tron 1",
  blockHeight: 0,
  balance: "375978130",
  balanceHistory: {},
  spendableBalance: "978130",
  operations: [
    {
      id:
        "js:2:tron:TRON_ID:-441d1901895a5f14a4f1cd71bf888b7ef4296d1b7fbfef35cf98722310b14227-FREEZE",
      hash: "441d1901895a5f14a4f1cd71bf888b7ef4296d1b7fbfef35cf98722310b14227",
      type: "FREEZE",
      blockHeight: 18060743,
      blockHash: null,
      accountId: "js:2:tron:TRON_ID:",
      senders: ["TRON_ID"],
      recipients: [],
      date: "2020-03-17T11:23:12.000Z",
      value: "0",
      fee: "0",
      extra: { frozenAmount: "1000000", resource: "BANDWIDTH" },
      subOperations: []
    },
    {
      id:
        "js:2:tron:TRON_ID:-fa1186af55003febff74130508e66560b7f09de7dde30b7bf67f670678c0c58b-VOTE",
      hash: "fa1186af55003febff74130508e66560b7f09de7dde30b7bf67f670678c0c58b",
      type: "VOTE",
      blockHeight: 17827337,
      blockHash: null,
      accountId: "js:2:tron:TRON_ID:",
      senders: ["TRON_ID"],
      recipients: [],
      date: "2020-03-09T08:44:39.000Z",
      value: "0",
      fee: "0",
      extra: {
        votes: [
          { address: "TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH", count: 281 },
          { address: "TGj1Ej1qRzL9feLTLhjwgxXF4Ct6GTWg2U", count: 55 }
        ]
      },
      subOperations: []
    },
    {
      id:
        "js:2:tron:TRON_ID:-c2723b0b9a795acda68b159ce90dd665b1ec487e54bec8372934ee6aed5a18ad-OUT",
      hash: "c2723b0b9a795acda68b159ce90dd665b1ec487e54bec8372934ee6aed5a18ad",
      type: "OUT",
      blockHeight: 17633222,
      blockHash: null,
      accountId: "js:2:tron:TRON_ID:",
      senders: ["TRON_ID"],
      recipients: ["TX1gEuaqbsC8KbtMk2SonU2EC4Krh1Cbsy"],
      date: "2020-03-02T14:54:48.000Z",
      value: "700000",
      fee: "0",
      extra: {},
      subOperations: []
    },
    {
      id:
        "js:2:tron:TRON_ID:-88a4fd5ecd8590abdfa4c769e7127b4dcbf7c6d79d8b40d222a2d2629ec63742-VOTE",
      hash: "88a4fd5ecd8590abdfa4c769e7127b4dcbf7c6d79d8b40d222a2d2629ec63742",
      type: "VOTE",
      blockHeight: 17320353,
      blockHash: null,
      accountId: "js:2:tron:TRON_ID:",
      senders: ["TRON_ID"],
      recipients: [],
      date: "2020-02-20T17:32:57.000Z",
      value: "0",
      fee: "0",
      extra: {
        votes: [
          { address: "TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH", count: 300 },
          { address: "TGj1Ej1qRzL9feLTLhjwgxXF4Ct6GTWg2U", count: 74 }
        ]
      },
      subOperations: []
    },
    {
      id:
        "js:2:tron:TRON_ID:-298cb0f9f53290cb7f535be01ef554dec46c4b7ba7d85e7e45562c33d9a0af68-FREEZE",
      hash: "298cb0f9f53290cb7f535be01ef554dec46c4b7ba7d85e7e45562c33d9a0af68",
      type: "FREEZE",
      blockHeight: 17262379,
      blockHash: null,
      accountId: "js:2:tron:TRON_ID:",
      senders: ["TRON_ID"],
      recipients: [],
      date: "2020-02-18T17:13:03.000Z",
      value: "0",
      fee: "0",
      extra: { frozenAmount: "374000000", resource: "BANDWIDTH" },
      subOperations: []
    },
    {
      id:
        "js:2:tron:TRON_ID:-fa2fead8eb4789dfea70dca40fbf15878d39f58a52d583fddd80748081475a78-IN",
      hash: "fa2fead8eb4789dfea70dca40fbf15878d39f58a52d583fddd80748081475a78",
      type: "IN",
      blockHeight: 17087079,
      blockHash: null,
      accountId: "js:2:tron:TRON_ID:",
      senders: ["TXufMKjStJkxYqgrmBXL7NNs8nWNEoFZvd"],
      recipients: ["TRON_ID"],
      date: "2020-02-12T15:02:36.000Z",
      value: "50000000",
      fee: "0",
      extra: {},
      subOperations: []
    },
    {
      id:
        "js:2:tron:TRON_ID:-0f7c86c52e123103a1dd4ad46f2b91084557d46303b8b67f46341cc3be1b9928-OUT",
      hash: "0f7c86c52e123103a1dd4ad46f2b91084557d46303b8b67f46341cc3be1b9928",
      type: "OUT",
      blockHeight: 17087029,
      blockHash: null,
      accountId: "js:2:tron:TRON_ID:",
      senders: ["TRON_ID"],
      recipients: ["TXufMKjStJkxYqgrmBXL7NNs8nWNEoFZvd"],
      date: "2020-02-12T15:00:06.000Z",
      value: "50000000",
      fee: "0",
      extra: {},
      subOperations: []
    },
    {
      id:
        "js:2:tron:TRON_ID:-b115f066a969972efcb229d657e9ae776ef413dab89a3ce9e85db46f8c378dc9-IN",
      hash: "b115f066a969972efcb229d657e9ae776ef413dab89a3ce9e85db46f8c378dc9",
      type: "IN",
      blockHeight: 17086991,
      blockHash: null,
      accountId: "js:2:tron:TRON_ID:",
      senders: ["TXufMKjStJkxYqgrmBXL7NNs8nWNEoFZvd"],
      recipients: ["TRON_ID"],
      date: "2020-02-12T14:58:12.000Z",
      value: "364769811",
      fee: "0",
      extra: {},
      subOperations: []
    },
    {
      id:
        "js:2:tron:TRON_ID:-f777ab64d5b80408e46563f476604e997033afce0b0f1e5d315bf92603548dcb-IN",
      hash: "f777ab64d5b80408e46563f476604e997033afce0b0f1e5d315bf92603548dcb",
      type: "IN",
      blockHeight: 17086819,
      blockHash: null,
      accountId: "js:2:tron:TRON_ID:",
      senders: ["TXufMKjStJkxYqgrmBXL7NNs8nWNEoFZvd"],
      recipients: ["TRON_ID"],
      date: "2020-02-12T14:49:36.000Z",
      value: "10000000",
      fee: "100000",
      extra: {},
      subOperations: []
    }
  ],
  operationsCount: 12,
  pendingOperations: [],
  unit: { name: "TRX", code: "TRX", magnitude: 6 },
  currencyId: "tron",
  unitMagnitude: 6,
  lastSyncDate: "2020-03-18T09:22:46.747Z",
  subAccounts: [],
  tronResources: {
    frozen: {
      bandwidth: {
        amount: "375000000",
        expiredAt: "2020-03-20T11:23:09.000Z"
      },
      energy: null
    },
    delegatedFrozen: { bandwidth: null, energy: null },
    delegatedResources: [],
    votes: [
      { address: "TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH", voteCount: 281 },
      { address: "TGj1Ej1qRzL9feLTLhjwgxXF4Ct6GTWg2U", voteCount: 55 }
    ],
    tronPower: 375,
    energy: "0",
    bandwidth: {
      freeUsed: "0",
      freeLimit: "5000",
      gainedUsed: "201",
      gainedLimit: "679"
    },
    unwithdrawnReward: "13602",
    lastWithdrawnRewardDate: null,
    lastVotedDate: "2020-03-09T08:44:39.000Z"
  }
});

export const mockAccountNoVote = fromAccountRaw({
  type: "Account",
  id: "js:2:tron:TRON_ID:",
  starred: true,
  seedIdentifier: "TRON_ID",
  derivationMode: "",
  index: 0,
  freshAddress: "TRON_ID",
  freshAddressPath: "44'/195'/0'/0/0",
  freshAddresses: [
    {
      address: "TRON_ID",
      derivationPath: "44'/195'/0'/0/0"
    }
  ],
  name: "Tron 1",
  blockHeight: 0,
  balance: "375978130",
  balanceHistory: {},
  spendableBalance: "978130",
  operations: [
    {
      id:
        "js:2:tron:TRON_ID:-441d1901895a5f14a4f1cd71bf888b7ef4296d1b7fbfef35cf98722310b14227-FREEZE",
      hash: "441d1901895a5f14a4f1cd71bf888b7ef4296d1b7fbfef35cf98722310b14227",
      type: "FREEZE",
      blockHeight: 18060743,
      blockHash: null,
      accountId: "js:2:tron:TRON_ID:",
      senders: ["TRON_ID"],
      recipients: [],
      date: "2020-03-17T11:23:12.000Z",
      value: "0",
      fee: "0",
      extra: { frozenAmount: "1000000", resource: "BANDWIDTH" },
      subOperations: []
    },
    {
      id:
        "js:2:tron:TRON_ID:-c2723b0b9a795acda68b159ce90dd665b1ec487e54bec8372934ee6aed5a18ad-OUT",
      hash: "c2723b0b9a795acda68b159ce90dd665b1ec487e54bec8372934ee6aed5a18ad",
      type: "OUT",
      blockHeight: 17633222,
      blockHash: null,
      accountId: "js:2:tron:TRON_ID:",
      senders: ["TRON_ID"],
      recipients: ["TX1gEuaqbsC8KbtMk2SonU2EC4Krh1Cbsy"],
      date: "2020-03-02T14:54:48.000Z",
      value: "700000",
      fee: "0",
      extra: {},
      subOperations: []
    },
    {
      id:
        "js:2:tron:TRON_ID:-298cb0f9f53290cb7f535be01ef554dec46c4b7ba7d85e7e45562c33d9a0af68-FREEZE",
      hash: "298cb0f9f53290cb7f535be01ef554dec46c4b7ba7d85e7e45562c33d9a0af68",
      type: "FREEZE",
      blockHeight: 17262379,
      blockHash: null,
      accountId: "js:2:tron:TRON_ID:",
      senders: ["TRON_ID"],
      recipients: [],
      date: "2020-02-18T17:13:03.000Z",
      value: "0",
      fee: "0",
      extra: { frozenAmount: "374000000", resource: "BANDWIDTH" },
      subOperations: []
    },
    {
      id:
        "js:2:tron:TRON_ID:-fa2fead8eb4789dfea70dca40fbf15878d39f58a52d583fddd80748081475a78-IN",
      hash: "fa2fead8eb4789dfea70dca40fbf15878d39f58a52d583fddd80748081475a78",
      type: "IN",
      blockHeight: 17087079,
      blockHash: null,
      accountId: "js:2:tron:TRON_ID:",
      senders: ["TXufMKjStJkxYqgrmBXL7NNs8nWNEoFZvd"],
      recipients: ["TRON_ID"],
      date: "2020-02-12T15:02:36.000Z",
      value: "50000000",
      fee: "0",
      extra: {},
      subOperations: []
    },
    {
      id:
        "js:2:tron:TRON_ID:-0f7c86c52e123103a1dd4ad46f2b91084557d46303b8b67f46341cc3be1b9928-OUT",
      hash: "0f7c86c52e123103a1dd4ad46f2b91084557d46303b8b67f46341cc3be1b9928",
      type: "OUT",
      blockHeight: 17087029,
      blockHash: null,
      accountId: "js:2:tron:TRON_ID:",
      senders: ["TRON_ID"],
      recipients: ["TXufMKjStJkxYqgrmBXL7NNs8nWNEoFZvd"],
      date: "2020-02-12T15:00:06.000Z",
      value: "50000000",
      fee: "0",
      extra: {},
      subOperations: []
    },
    {
      id:
        "js:2:tron:TRON_ID:-b115f066a969972efcb229d657e9ae776ef413dab89a3ce9e85db46f8c378dc9-IN",
      hash: "b115f066a969972efcb229d657e9ae776ef413dab89a3ce9e85db46f8c378dc9",
      type: "IN",
      blockHeight: 17086991,
      blockHash: null,
      accountId: "js:2:tron:TRON_ID:",
      senders: ["TXufMKjStJkxYqgrmBXL7NNs8nWNEoFZvd"],
      recipients: ["TRON_ID"],
      date: "2020-02-12T14:58:12.000Z",
      value: "364769811",
      fee: "0",
      extra: {},
      subOperations: []
    },
    {
      id:
        "js:2:tron:TRON_ID:-f777ab64d5b80408e46563f476604e997033afce0b0f1e5d315bf92603548dcb-IN",
      hash: "f777ab64d5b80408e46563f476604e997033afce0b0f1e5d315bf92603548dcb",
      type: "IN",
      blockHeight: 17086819,
      blockHash: null,
      accountId: "js:2:tron:TRON_ID:",
      senders: ["TXufMKjStJkxYqgrmBXL7NNs8nWNEoFZvd"],
      recipients: ["TRON_ID"],
      date: "2020-02-12T14:49:36.000Z",
      value: "10000000",
      fee: "100000",
      extra: {},
      subOperations: []
    }
  ],
  operationsCount: 12,
  pendingOperations: [],
  unit: { name: "TRX", code: "TRX", magnitude: 6 },
  currencyId: "tron",
  unitMagnitude: 6,
  lastSyncDate: "2020-03-18T09:22:46.747Z",
  subAccounts: [],
  tronResources: {
    frozen: {
      bandwidth: {
        amount: "375000000",
        expiredAt: "2020-03-20T11:23:09.000Z"
      },
      energy: null
    },
    delegatedFrozen: { bandwidth: null, energy: null },
    delegatedResources: [],
    votes: [
      { address: "TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH", voteCount: 281 },
      { address: "TGj1Ej1qRzL9feLTLhjwgxXF4Ct6GTWg2U", voteCount: 55 }
    ],
    tronPower: 375,
    energy: "0",
    bandwidth: {
      freeUsed: "0",
      freeLimit: "5000",
      gainedUsed: "201",
      gainedLimit: "679"
    },
    unwithdrawnReward: "13602",
    lastWithdrawnRewardDate: null,
    lastVotedDate: null
  }
});
