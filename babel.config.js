module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // react-native-reanimated (seit 2026-09-06, siehe Freispiel-Screen in
    // src/screens/FreispielScreen.tsx) — das Plugin MUSS laut offizieller
    // Reanimated-Doku als letztes Element in der Liste stehen.
    plugins: ["react-native-reanimated/plugin"],
  };
};
