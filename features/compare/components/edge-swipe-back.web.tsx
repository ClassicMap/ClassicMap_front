import * as React from 'react';

interface EdgeSwipeBackProps {
  onBack: () => void;
  children: React.ReactNode;
}

/** 웹은 브라우저 뒤로와 화면의 뒤로 단추를 쓴다 */
export function EdgeSwipeBack({ children }: EdgeSwipeBackProps) {
  return <>{children}</>;
}
