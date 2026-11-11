/** 글자를 받지 않는 input 종류. 여기에 포커스가 있어도 화면 단축키는 살아 있어야 한다 */
const NON_TEXT_INPUTS = new Set([
  'range',
  'checkbox',
  'radio',
  'button',
  'submit',
  'reset',
  'file',
  'color',
]);

/**
 * 키 입력이 글을 쓰는 중에 난 것인가 (웹). 화면 단축키가 입력을 가로채지 않게 할 때 쓴다.
 * 슬라이더(`<input type="range">`)처럼 글자를 받지 않는 input 은 글 쓰는 중으로 보지 않는다.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element || typeof element.tagName !== 'string') return false;
  if (element.isContentEditable) return true;
  if (element.tagName === 'TEXTAREA') return true;
  if (element.tagName === 'INPUT') {
    return !NON_TEXT_INPUTS.has((element as HTMLInputElement).type);
  }
  return false;
}
