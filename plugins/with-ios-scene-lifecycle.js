/**
 * iOS 27 SDK 대응 (Expo SDK 54 네이티브 템플릿 보정).
 *
 * 1. iOS 27은 UIScene 라이프사이클을 채택하지 않은 앱을 실행 즉시 종료한다
 *    (UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption).
 *    AppDelegate가 만들던 창을 SceneDelegate로 옮기고, 씬으로 들어오는 URL·유니버설 링크·
 *    활성/백그라운드 전환을 기존 AppDelegate(ExpoAppDelegate 구독자, RCTLinkingManager)로 넘긴다.
 * 2. Xcode 27은 최소 배포 버전 15.0 미만 타깃을 빌드하지 않는다. 일부 Pod 리소스 번들이
 *    12.4·13.4로 선언돼 있어 post_install에서 앱과 같은 15.1로 올린다.
 */
const { withAppDelegate, withInfoPlist, withPodfile } = require('expo/config-plugins');

const MARKER = '// @classicmap/scene-lifecycle';
const POD_MARKER = '# @classicmap/pod-deployment-target';
const MIN_POD_DEPLOYMENT_TARGET = '15.1';

const WINDOW_BLOCK = /#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\(\n\s*withModuleName: "main",\n\s*in: window,\n\s*launchOptions: launchOptions\)\n#endif\n/;

const FACTORY_PROPERTY = '  var reactNativeFactory: RCTReactNativeFactory?\n';

const SCENE_DELEGATE = `
${MARKER}
/// 창은 씬이 만든다. URL·유저 액티비티·생명주기는 AppDelegate로 넘겨
/// Expo 구독자(expo-linking 등)와 RCTLinkingManager가 전과 같이 받게 한다.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  private var appDelegate: AppDelegate? {
    UIApplication.shared.delegate as? AppDelegate
  }

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = appDelegate,
          let factory = appDelegate.reactNativeFactory else { return }

    var launchOptions = appDelegate.launchOptions ?? [:]
    // 콜드 스타트 링크: React Native가 뜨기 전에 넘겨야 초기 URL로 잡힌다
    if let url = connectionOptions.urlContexts.first?.url {
      launchOptions[.url] = url
      _ = appDelegate.application(UIApplication.shared, open: url, options: [:])
    }
    for activity in connectionOptions.userActivities {
      _ = appDelegate.application(UIApplication.shared, continue: activity) { _ in }
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window
    factory.startReactNative(withModuleName: "main", in: window, launchOptions: launchOptions)
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      _ = appDelegate?.application(UIApplication.shared, open: context.url, options: [:])
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = appDelegate?.application(UIApplication.shared, continue: userActivity) { _ in }
  }

  func sceneDidBecomeActive(_ scene: UIScene) {
    appDelegate?.applicationDidBecomeActive(UIApplication.shared)
  }

  func sceneWillResignActive(_ scene: UIScene) {
    appDelegate?.applicationWillResignActive(UIApplication.shared)
  }

  func sceneWillEnterForeground(_ scene: UIScene) {
    appDelegate?.applicationWillEnterForeground(UIApplication.shared)
  }

  func sceneDidEnterBackground(_ scene: UIScene) {
    appDelegate?.applicationDidEnterBackground(UIApplication.shared)
  }
}
`;

function withSceneManifest(config) {
  return withInfoPlist(config, (mod) => {
    mod.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return mod;
  });
}

function withSceneDelegate(config) {
  return withAppDelegate(config, (mod) => {
    if (mod.modResults.language !== 'swift') {
      throw new Error('with-ios-scene-lifecycle: Swift AppDelegate만 지원합니다.');
    }
    let contents = mod.modResults.contents;
    if (contents.includes(MARKER)) return mod;

    if (!WINDOW_BLOCK.test(contents) || !contents.includes(FACTORY_PROPERTY)) {
      throw new Error(
        'with-ios-scene-lifecycle: AppDelegate.swift가 SDK 54 템플릿과 달라 창 생성 코드를 옮기지 못했습니다. 플러그인을 템플릿에 맞춰 고쳐 주세요.'
      );
    }
    contents = contents.replace(WINDOW_BLOCK, '    self.launchOptions = launchOptions\n');
    contents = contents.replace(
      FACTORY_PROPERTY,
      `${FACTORY_PROPERTY}  var launchOptions: [UIApplication.LaunchOptionsKey: Any]?\n`
    );
    mod.modResults.contents = `${contents.trimEnd()}\n${SCENE_DELEGATE}`;
    return mod;
  });
}

function withPodDeploymentTarget(config) {
  return withPodfile(config, (mod) => {
    let contents = mod.modResults.contents;
    if (contents.includes(POD_MARKER)) return mod;

    // react_native_post_install이 빌드 설정을 만진 뒤에 올려야 덮이지 않는다
    const anchor = contents.match(/\n\s*react_native_post_install\([\s\S]*?\n\s*\)\n/)?.[0];
    if (!anchor) {
      throw new Error('with-ios-scene-lifecycle: Podfile에서 react_native_post_install 호출을 찾지 못했습니다.');
    }
    const snippet = [
      `    ${POD_MARKER}`,
      '    installer.pods_project.targets.each do |target|',
      '      target.build_configurations.each do |build_config|',
      "        current = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']",
      `        if current && Gem::Version.new(current) < Gem::Version.new('${MIN_POD_DEPLOYMENT_TARGET}')`,
      `          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MIN_POD_DEPLOYMENT_TARGET}'`,
      '        end',
      '      end',
      '    end',
      '',
    ].join('\n');
    mod.modResults.contents = contents.replace(anchor, `${anchor}${snippet}`);
    return mod;
  });
}

module.exports = function withIosSceneLifecycle(config) {
  return withPodDeploymentTarget(withSceneDelegate(withSceneManifest(config)));
};
