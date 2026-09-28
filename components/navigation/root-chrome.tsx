import * as React from 'react';

/** 네이티브는 셸이 없다. 웹 구현은 root-chrome.web.tsx */
export function RootChrome({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
