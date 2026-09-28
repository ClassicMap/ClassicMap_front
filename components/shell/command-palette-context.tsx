import * as React from 'react';

interface CommandPaletteState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const CommandPaletteContext = React.createContext<CommandPaletteState | null>(null);

/** ⌘K / Ctrl+K 로 팔레트를 연다. 입력 중이어도 동작해야 해서 window에 건다. */
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
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const value = React.useMemo(() => ({ open, setOpen, toggle }), [open, toggle]);
  return <CommandPaletteContext.Provider value={value}>{children}</CommandPaletteContext.Provider>;
}

export function useCommandPalette(): CommandPaletteState {
  const context = React.useContext(CommandPaletteContext);
  if (!context) throw new Error('useCommandPalette는 CommandPaletteProvider 안에서만 씁니다.');
  return context;
}
