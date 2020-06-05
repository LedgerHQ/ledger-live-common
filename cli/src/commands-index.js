import app from "./commands/app";
import appsCheckAllAppVersions from "./commands/appsCheckAllAppVersions";
import appsInstallAll from "./commands/appsInstallAll";
import appsUpdateTestAll from "./commands/appsUpdateTestAll";
import balanceHistory from "./commands/balanceHistory";
import bot from "./commands/bot";
import botPortfolio from "./commands/botPortfolio";
import broadcast from "./commands/broadcast";
import cleanSpeculos from "./commands/cleanSpeculos";
import devDeviceAppsScenario from "./commands/devDeviceAppsScenario";
import deviceAppVersion from "./commands/deviceAppVersion";
import deviceInfo from "./commands/deviceInfo";
import deviceVersion from "./commands/deviceVersion";
import discoverDevices from "./commands/discoverDevices";
import envs from "./commands/envs";
import estimateMaxSpendable from "./commands/estimateMaxSpendable";
import exportAccounts from "./commands/exportAccounts";
import firmwareRepair from "./commands/firmwareRepair";
import firmwareUpdate from "./commands/firmwareUpdate";
import generateTestScanAccounts from "./commands/generateTestScanAccounts";
import generateTestTransaction from "./commands/generateTestTransaction";
import genuineCheck from "./commands/genuineCheck";
import getAccountNetworkInfo from "./commands/getAccountNetworkInfo";
import getAddress from "./commands/getAddress";
import getTransactionStatus from "./commands/getTransactionStatus";
import libcoreReset from "./commands/libcoreReset";
import libcoreSetPassword from "./commands/libcoreSetPassword";
import liveData from "./commands/liveData";
import managerListApps from "./commands/managerListApps";
import portfolio from "./commands/portfolio";
import proxy from "./commands/proxy";
import receive from "./commands/receive";
import repl from "./commands/repl";
import send from "./commands/send";
import signMessage from "./commands/signMessage";
import sync from "./commands/sync";
import testDetectOpCollision from "./commands/testDetectOpCollision";
import testGetTrustedInputFromTxHash from "./commands/testGetTrustedInputFromTxHash";
import validRecipient from "./commands/validRecipient";
import version from "./commands/version";

export default {
  app,
  appsCheckAllAppVersions,
  appsInstallAll,
  appsUpdateTestAll,
  balanceHistory,
  bot,
  botPortfolio,
  broadcast,
  cleanSpeculos,
  devDeviceAppsScenario,
  deviceAppVersion,
  deviceInfo,
  deviceVersion,
  discoverDevices,
  envs,
  estimateMaxSpendable,
  exportAccounts,
  firmwareRepair,
  firmwareUpdate,
  generateTestScanAccounts,
  generateTestTransaction,
  genuineCheck,
  getAccountNetworkInfo,
  getAddress,
  getTransactionStatus,
  libcoreReset,
  libcoreSetPassword,
  liveData,
  managerListApps,
  portfolio,
  proxy,
  receive,
  repl,
  send,
  signMessage,
  sync,
  testDetectOpCollision,
  testGetTrustedInputFromTxHash,
  validRecipient,
  version,
};
