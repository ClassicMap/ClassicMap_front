import * as React from 'react';

type Props = Record<string, unknown>;
type Handler = (...args: unknown[]) => void;

/**
 * Base UI 파트의 `render` 에 React Native 요소(Pressable·Button·Link 안의 Pressable)를 넘길 수 있게 잇는다. 웹 전용.
 *
 * react-native-web 의 Pressable 은 onClick 을 자기 것으로 덮고 data-* 를 버린다. 그래서
 * - onClick 은 onPress 로(요소가 가진 onPress 다음에 부른다)
 * - data-* 는 dataSet 으로(`data-[popup-open]:` 같은 variant 가 먹게)
 * 옮기고, 그 밖의 것(ref, aria-*, role, 키보드·포커스·마우스 손잡이)은 요소의 것과 합쳐 넘긴다.
 */
export function renderPressable(element: React.ReactElement<Props>) {
  return function render(props: object): React.ReactElement {
    const own = element.props;
    const { onClick, className, style, children, ...rest } = props as Props;
    const next: Props = {};
    const dataSet: Record<string, string> = {
      ...(own.dataSet as Record<string, string> | undefined),
    };
    for (const [key, value] of Object.entries(rest)) {
      if (key.startsWith('data-')) {
        if (value !== undefined && value !== null && value !== false) {
          dataSet[key.slice(5)] = value === true ? '' : String(value);
        }
      } else if (typeof value === 'function' && typeof own[key] === 'function') {
        const mine = own[key] as Handler;
        const theirs = value as Handler;
        next[key] = (...args: unknown[]) => {
          mine(...args);
          theirs(...args);
        };
      } else if (value !== undefined) {
        next[key] = value;
      }
    }
    const press = own.onPress as Handler | undefined;
    const click = onClick as Handler | undefined;
    next.onPress = (...args: unknown[]) => {
      press?.(...args);
      click?.(...args);
    };
    next.dataSet = dataSet;
    next.className = [own.className, className].filter(Boolean).join(' ') || undefined;
    if (style !== undefined) next.style = own.style ? [own.style, style] : style;
    // Base UI 는 파트의 자식을 props 로 넘긴다. 요소가 이미 자식을 가졌으면 그것을 둔다
    return React.cloneElement(element, next, (own.children ?? children) as React.ReactNode);
  };
}
