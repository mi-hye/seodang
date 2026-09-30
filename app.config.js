const TEST_ADMOB_ANDROID_APP_ID = "ca-app-pub-3940256099942544~3347511713";
const TEST_ADMOB_IOS_APP_ID = "ca-app-pub-3940256099942544~1458002511";

module.exports = ({ config }) => {
  const androidAppId =
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID ?? TEST_ADMOB_ANDROID_APP_ID;
  const iosAppId =
    process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID ?? TEST_ADMOB_IOS_APP_ID;

  if (process.env.EAS_BUILD_PROFILE === "production") {
    const requiredVariables =
      process.env.EAS_BUILD_PLATFORM === "ios"
        ? [
            "EXPO_PUBLIC_ADMOB_IOS_APP_ID",
            "EXPO_PUBLIC_ADMOB_REWARDED_IOS",
            "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY",
          ]
        : process.env.EAS_BUILD_PLATFORM === "android"
          ? [
              "EXPO_PUBLIC_ADMOB_ANDROID_APP_ID",
              "EXPO_PUBLIC_ADMOB_REWARDED_ANDROID",
              "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY",
            ]
          : [];
    const missingVariables = requiredVariables.filter((name) => !process.env[name]);
    if (missingVariables.length > 0) {
      throw new Error(`Production build requires: ${missingVariables.join(", ")}`);
    }
  }

  return {
    ...config,
    plugins: config.plugins.map((plugin) => {
      const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;
      if (pluginName !== "react-native-google-mobile-ads") return plugin;

      return [
        "react-native-google-mobile-ads",
        {
          androidAppId,
          iosAppId,
          delayAppMeasurementInit: true,
        },
      ];
    }),
  };
};
