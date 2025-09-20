module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // 'react-native-reanimated/plugin' // Removed deprecated plugin
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './',
            '@gammon/shared-core': './packages/shared-core/src',
          },
        },
      ],
    ]
  };
};
