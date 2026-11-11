/** 앱(index.tsx)과 웹(index.web.tsx) 구현이 함께 쓰는 props. 값 하나짜리 슬라이더다 */
export interface SliderProps {
  value: number;
  /** 끌거나 키로 옮기는 동안 계속 부른다 */
  onValueChange?: (value: number) => void;
  /** 놓았을 때(누른 자리, 키 한 번) 부른다 */
  onValueCommitted?: (value: number) => void;
  min?: number;
  max?: number;
  /** 값의 눈금. ←→ 한 번에 이만큼 움직인다 */
  step?: number;
  /** Shift+←→, PageUp/PageDown 한 번에 움직이는 양 (웹) */
  largeStep?: number;
  disabled?: boolean;
  /** 스크린리더가 읽는 이름 */
  'aria-label': string;
  /** 스크린리더가 읽는 값 */
  getAriaValueText?: (value: number) => string;
  className?: string;
  classNames?: {
    control?: string;
    track?: string;
    indicator?: string;
    thumb?: string;
  };
  /** 채움 색 (CSS 색). 없으면 글자색 */
  indicatorColor?: string;
  /** 손잡이 안에 그릴 것(끄는 동안 값 말풍선 등) */
  thumbChildren?: React.ReactNode;
  /** 웹 전용: 손잡이의 키 입력. 여기서 기본 동작을 막고 직접 처리할 수 있다 */
  onThumbKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}
