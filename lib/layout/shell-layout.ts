/** 셸 영역의 크기 (px). 영역을 그리는 곳(components/layout/shell.tsx)과 그 안에 들어가는 조각이 함께 본다 */
export const SHELL = {
  /** 영역 사이 간격이자 화면 가장자리 여백 */
  gap: 8,
  /** 영역 모서리 둥글기 */
  radius: 9,
  sidebarWidth: 232,
  /** 접힌 사이드바(아이콘만) */
  sidebarCollapsedWidth: 60,
  topBarHeight: 56,
  /** 오른쪽 대기열 패널 */
  queueWidth: 320,
  /** 하단 재생바 */
  playerBarHeight: 76,
} as const;
