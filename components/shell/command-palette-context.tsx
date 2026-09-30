import * as React from 'react';

interface CommandPaletteState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const CommandPaletteContext = React.createContext<CommandPaletteState | null>(null);

/**
 * ⌘K / Ctrl+K 로 팔레트를 연다. 입력 중이어도 동작해야 해서 window의 캡처 단계에 건다
 * (RN TextInput은 키 이벤트 전파를 끊는다).
 */
export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const toggle = React.useCallback(() => setOpen((value) => !value), []);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);

  const value = React.useMemo(() => ({ open, setOpen, toggle }), [open, toggle]);
  return <CommandPaletteContext.Provider value={value}>{children}</CommandPaletteContext.Provider>;
}

export function useCommandPalette(): CommandPaletteState {
  const context = React.useContext(CommandPaletteContext);
  if (!context) throw new Error('useCommandPalette는 CommandPaletteProvider 안에서만 씁니다.');
  return context;
}
