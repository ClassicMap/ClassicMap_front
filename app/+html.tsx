import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
const LAYOUT_SCRIPT = `(function(){var w=window.innerWidth;document.documentElement.dataset.layout=w<768?'mobile':w<1024?'tablet':w<1536?'desktop':'wide';})();`;
// NativeWind는 darkMode: 'class'라 html의 dark 클래스로만 첫 테마를 정한다. 시스템 설정을 따르도록 먼저 붙인다
const THEME_SCRIPT = `(function(){try{if(window.matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.classList.add('dark');}catch(e){}})();`;

// 마우스 연결·"스크롤 막대 항상 표시" 환경은 자리를 차지하는 클래식 스크롤바를 쓴다. 그때만 표시를 붙여 얇게 바꾼다
const SCROLLBAR_SCRIPT = `(function(){try{var d=document.createElement('div');d.style.cssText='position:absolute;top:-9999px;width:50px;height:50px;overflow:scroll';document.documentElement.appendChild(d);var classic=d.offsetWidth-d.clientWidth>0;document.documentElement.removeChild(d);if(classic)document.documentElement.classList.add('classic-scrollbar');}catch(e){}})();`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ko" className="bg-background" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Base URL for subpath deployment */}
        <base href="/classicmap/" />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* 본문 서체: Pretendard 가변 폰트 동적 서브셋 (쓰는 글자 범위만 받는다) */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {/* 첫 렌더 전에 폭 구간을 정해 셸 레이아웃이 튀지 않게 한다 (설계 문서 6.2) */}
        <script dangerouslySetInnerHTML={{ __html: LAYOUT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: SCROLLBAR_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
