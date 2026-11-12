const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// @base-ui/react 는 package.json "imports" 에 `#prehydration/...` 같은 패키지 안쪽 경로를 둔다.
// 같은 필드의 `#formatErrorMessage` 가 "./" 로 시작하지 않아 Metro 가 필드 전체를 버리고 파일 찾기로 넘어가 실패한다.
// 쓰이는 경로(`#prehydration/<부품>`)만 여기서 직접 풀어 준다.
const BASE_UI_ROOT = path.dirname(require.resolve('@base-ui/react/package.json'));
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('#prehydration/') && context.originModulePath.startsWith(BASE_UI_ROOT)) {
    return {
      type: 'sourceFile',
      filePath: path.join(BASE_UI_ROOT, moduleName.slice('#prehydration/'.length), 'prehydrationScript.min.js'),
    };
  }
  return (upstreamResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
