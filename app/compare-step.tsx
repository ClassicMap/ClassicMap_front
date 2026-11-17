import { useLocale } from '@/lib/i18n';
import { CompareMobileScreen } from '@/features/compare/components/compare-mobile-screen';
import * as React from 'react';

/**
 * 앱의 비교 단계(작곡가·장르·작품·1:1). 탭 안이 아니라 루트 스택에 쌓여, 어느 화면에서 열어도
 * 밀기·시스템 뒤로가 연 화면으로 한 단계씩 돌아간다 (#82). 여는 곳은 `lib/navigation/go.ts`.
 * 폴더가 아니라 파일 하나다. 정적 export 에 폴더가 생기면 nginx `$uri/` 리다이렉트가 /classicmap 접두사를 뺀다
 */
export default function CompareStepScreen() {
  useLocale();
  return <CompareMobileScreen />;
}
