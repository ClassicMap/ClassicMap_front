import { Redirect } from 'expo-router';
import * as React from 'react';

/** 첫 진입은 홈으로 보낸다. 첫 방문 안내는 홈 위 카드가 맡는다 (설계 문서 7.11) */
export default function Screen() {
  return <Redirect href="/(tabs)/home" />;
}
