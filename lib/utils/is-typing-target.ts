/**
 * 키 입력이 글을 쓰는 중에 난 것인가 (웹). 화면 단축키가 입력을 가로채지 않게 할 때 쓴다.
 * 슬라이더(`<input type="range">`)는 글자를 받지 않으므로 글 쓰는 중으로 보지 않는다
 * (슬라이더에 포커스가 있어도 재생·전체 화면 같은 단축키가 살아 있어야 한다).
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element || typeof element.tagName !== 'string') return false;
  if (element.isContentEditable) return true;
  if (element.tagName === 'TEXTAREA') return true;
  if (element.tagName === 'INPUT') return (element as HTMLInputElement).type !== 'range';
  return false;
}
