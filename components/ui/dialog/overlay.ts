/**
 * 다이얼로그·시트의 어두운 막 (웹). iOS Safari 는 fixed 막이 화면을 다 못 덮어 absolute 로 바꾼다 (Base UI 문서)
 */
export const OVERLAY_CLASS =
  'fixed inset-0 z-overlay min-h-dvh bg-black/50 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:transition-none supports-[-webkit-touch-callout:none]:absolute';
