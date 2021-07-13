export default {
  preset: "ts-jest",
  globals: {
    "ts-jest": {
      isolatedModules: true,
    },
  },
  testEnvironment: "node",
  coverageDirectory: "./coverage/",
  coverageReporters: ["json", "lcov", "clover"],
  collectCoverage: true,
  coveragePathIgnorePatterns: ["src/__tests__"],
  modulePathIgnorePatterns: [
    "<rootDir>/benchmark/.*",
    "<rootDir>/cli/.yalc/.*",
  ],
  testPathIgnorePatterns: [
    "benchmark/",
    "tools/",
    "mobile-test-app/",
    "lib/",
    "lib-es/",
    ".yalc",
    "cli/",
    "test-helpers/",
  ],
  moduleNameMapper: {
    "^@polkadot/util$": "@polkadot/util/index.cjs",
    "^@polkadot/util-crypto$": "@polkadot/util-crypto/index.cjs",
    "^@polkadot/wasm-crypto$": "@polkadot/wasm-crypto/index.cjs",
    "^@polkadot/x-textdecoder/node$": "@polkadot/x-textdecoder/node.cjs", // WHY ARE U NOT WORKING !!!???
  },
  transformIgnorePatterns: [
    "/node_modules/(?!@polkadot|@babel/runtime/helpers/esm/)",
  ],
  moduleDirectories: ["node_modules", "cli/node_modules"],
};
