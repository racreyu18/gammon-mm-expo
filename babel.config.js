module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-worklets/plugin' // Required for react-native-reanimated (moved from react-native-reanimated/plugin)
    ]
  };
};
