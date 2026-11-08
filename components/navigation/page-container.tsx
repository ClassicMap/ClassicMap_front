import * as React from 'react';
import { View } from 'react-native';

/** 앱(네이티브)은 본문 전환을 내비게이터가 맡는다. 웹 구현은 page-container.web.tsx */
export function PageContainer({ children }: { children: React.ReactNode }) {
  return <View className="min-h-0 flex-1">{children}</View>;
}
