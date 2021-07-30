// @flow
import React, {  Component } from "react";
import { Text } from "ink";
import type { Device, Action } from "@ledgerhq/live-common/lib/hw/actions/types";
import { DeviceModelId } from "@ledgerhq/devices";

type OwnProps<R, H, P> = {
  overridesPreferredDeviceModel?: DeviceModelId;
  onResult?: ((P) => void);
  action: Action<R, H, P>;
  request: R;
};

type Props<R, H, P> = OwnProps<R, H, P>;

class OnResult extends Component<{ onResult: Function }> {
  componentDidMount() {
    const { onResult, ...rest } = this.props;
    onResult(rest);
  }

  render() {
    return null;
  }
}

/**
 * Perform an action involving a device.
 * @prop action: one of the actions/*
 * @prop request: an object that is the input of that action
 * @prop Result optional: an action produces a result, this gives a component to render it
 * @prop onResult optional: an action produces a result, this gives a callback to be called with it
 */
const DeviceAction = <R, H, P>({
  action,
  request,
  onResult,
}: Props<R, H, P>) => {
  // hack
  const currentDevice: Device = {
    deviceId: "",
    modelId: DeviceModelId.nanoS,
    wired: true
  }
  const hookState: any = action.useHook(currentDevice, request);
  const {
    appAndVersion,
    device,
    unresponsive,
    error,
    isLoading,
    allowManagerRequestedWording,
    requestQuitApp,
    deviceInfo,
    repairModalOpened,
    requestOpenApp,
    allowOpeningRequestedWording,
    installingApp,
    progress,
    listingApps,
    requiresAppInstallation,
    inWrongDeviceForAccount,
    onRetry,
    onAutoRepair,
    closeRepairModal,
    onRepairModal,
    deviceSignatureRequested,
    deviceStreamingProgress,
    displayUpgradeWarning,
    passWarning,
    initSwapRequested,
    initSwapError,
    initSwapResult,
    allowOpeningGranted,
    initSellRequested,
    initSellResult,
    initSellError,
    signMessageRequested,
  } = hookState;

  if (displayUpgradeWarning && appAndVersion) {
    return <Text>Warning: outdated app</Text>;
    // return renderWarningOutdated({ appName: appAndVersion.name, passWarning });
  }

  if (repairModalOpened && repairModalOpened.auto) {
    return <Text>Device need repair</Text>;
  }

  if (requestQuitApp) {
    return <Text>Please Quit App</Text>;
    // return renderRequestQuitApp({ modelId, type });
  }

  if (installingApp) {
    const appName = requestOpenApp;
    return <Text>Please Open App {appName}</Text>;
    // return renderInstallingApp({ appName, progress });
  }

  if (requiresAppInstallation) {
    const { appName, appNames: maybeAppNames } = requiresAppInstallation;
    const appNames = maybeAppNames?.length ? maybeAppNames : [appName];
    return <Text>Need App installation {appNames.join(", ")}</Text>;
    // return renderRequiresAppInstallation({ appNames });
  }

  if (allowManagerRequestedWording) {
    const wording = allowManagerRequestedWording;
    return <Text>Please allow {wording}</Text>;
    // return renderAllowManager({ modelId, type, wording });
  }

  if (listingApps) {
    return <Text>Listing apps</Text>;
    // return renderListingApps();
  }

  if (initSwapRequested && !initSwapResult && !initSwapError) {
    return <Text>Confirm Swap On Device</Text>;
    /*
    const { transaction, exchange, exchangeRate, status } = request;
    const { amountExpectedTo, estimatedFees } = hookState;
    return renderSwapDeviceConfirmation({
      modelId,
      type,
      transaction,
      exchangeRate,
      exchange,
      status,
      amountExpectedTo,
      estimatedFees,
    });
    */
  }

  if (initSellRequested && !initSellResult && !initSellError) {
    return <Text>Confirm Sell On Device</Text>;
    // return renderSellDeviceConfirmation({ modelId, type });
  }

  if (allowOpeningRequestedWording || requestOpenApp) {
    const wording = allowOpeningRequestedWording || requestOpenApp;
    return <Text>Please allow opening {wording}</Text>;
    /*
    // requestOpenApp for Nano S 1.3.1 (need to ask user to open the app.)
    const tokenContext = request && request.tokenCurrency;
    return renderAllowOpeningApp({
      modelId,
      type,
      wording,
      tokenContext,
      isDeviceBlocker: !requestOpenApp,
    });
    */
  }

  if (inWrongDeviceForAccount) {
    return <Text>wrong device app for this account</Text>;
    /*
    return renderInWrongAppForAccount({
      onRetry,
      accountName: inWrongDeviceForAccount.accountName,
    });
    */
  }

  if (!isLoading && error) {
    return <Text>Error {String(error)}</Text>;
  }

  if ((!isLoading && !device) || unresponsive) {
    return <Text>Please connect your device</Text>;
  }

  if (isLoading || (allowOpeningGranted && !appAndVersion)) {
    return <Text>Loading...</Text>;
  }

  if (deviceInfo && deviceInfo.isBootloader) {
    return <Text>Bootloader</Text>;
    // return renderBootloaderStep({ onAutoRepair });
  }

  if (request && device && deviceSignatureRequested) {
    const { account, parentAccount, status, transaction } = request as any;
    if (account && status && transaction) {
      return <Text>Confirmation Transaction on device</Text>;
      /*
      return (
        <TransactionConfirm
          device={device}
          account={account}
          parentAccount={parentAccount}
          transaction={transaction}
          status={status}
        />
      );
      */
    }
  }

  if (request && signMessageRequested) {
    return <Text>Confirmation signature on device</Text>;
    /*
    const { account } = request;
    return (
      <SignMessageConfirm
        device={device}
        account={account}
        signMessageRequested={signMessageRequested}
      />
    );
    */
  }

  if (typeof deviceStreamingProgress === "number") {
    return <Text>Loading...</Text>;
    /*
    return renderLoading({
      modelId,
      children:
        deviceStreamingProgress > 0 ? (
          // with streaming event, we have accurate version of the wording
          <Trans
            i18nKey="send.steps.verification.streaming.accurate"
            values={{ percentage: (deviceStreamingProgress * 100).toFixed(0) + "%" }}
          />
        ) : (
          // otherwise, we're not accurate (usually because we don't need to, it's fast case)

          <Trans i18nKey="send.steps.verification.streaming.inaccurate" />
        ),
    });
    */
  }

  const payload = action.mapResult(hookState);

  if (!payload) {
    return null;
  }

  return (
    <>
      {onResult ? <OnResult onResult={onResult} {...payload} /> : null}
    </>
  );
};

export default DeviceAction;