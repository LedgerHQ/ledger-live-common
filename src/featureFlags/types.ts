// Add others with union (e.g. "learn" | "market" | "foo")
export type FeatureId =
  | "learn"
  | "pushNotifications"
  | "llmUsbFirmwareUpdate"
  | string;

// We use objects instead of direct booleans for potential future improvements
// like feature versioning etc
export type Feature = {
  enabled: boolean;
};

export type DefaultFeatures = { [key in FeatureId]: Feature };
