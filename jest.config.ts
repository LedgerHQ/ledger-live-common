export default {
  preset: "ts-jest",
  testEnvironment: "node",
  coverageDirectory: "./coverage/",
  coverageReporters: ["json", "lcov", "clover"],
  collectCoverage: true,
  coveragePathIgnorePatterns: ["src/__tests__"],
  modulePathIgnorePatterns: [
    "<rootDir>/benchmark/.*",
    "<rootDir>/cli/.yalc/.*",
  ],
  testRegex: ".test.ts$",
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
  moduleDirectories: ["node_modules", "cli/node_modules"],
};
