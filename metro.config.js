const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Set public path for web builds
config.transformer = {
  ...config.transformer,
  publicPath: '/classicmap',
};

module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
