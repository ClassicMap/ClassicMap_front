import values from './layers.json';

/**
 * 겹침 순서 (docs/frontend-structure.md 5절). 값은 layers.json 한곳에 있고 tailwind.config.js 도 같은 파일을 읽는다.
 * 클래스로는 `z-raised`·`z-overlay` 처럼, 인라인 스타일로는 `LAYER.overlay` 처럼 쓴다. 숫자를 직접 쓰지 않는다.
 *
 * - raised: 화면 안에서 살짝 뜨는 것(붙는 머리줄, 카드 위 단추)
 * - rail: 사이드바 가장자리 띠
 * - floating: 모바일 미니 플레이어, 화면 이동 진행 막대
 * - player: 앱의 영상 자리
 * - overlay: 팝오버·셀렉트·툴팁·다이얼로그·시트·빠른 검색 (서로는 나중에 열린 것이 위)
 * - fullscreen: 전체 화면 영상
 */
export const LAYER: Readonly<Record<keyof typeof values, number>> = values;
