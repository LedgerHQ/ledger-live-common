export type FeatureId = "feature_foo" | "feature_bar";

export type DefaultFeatures = { [key in FeatureId]: boolean };
