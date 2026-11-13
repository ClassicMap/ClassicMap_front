/** 영어 사전: 그 밖(타임라인·공용 UI·데이터 이름표). 키는 화면의 한국어 원문 그대로, 값은 영어. */
export const MISC: Readonly<Record<string, string>> = {
  // 타임라인
  '주요 작곡가': 'Major composers',
  '비교 있는 작곡가': 'With comparisons',
  축소: 'Zoom out',
  확대: 'Zoom in',
  '전체 기간': 'All periods',
  '작곡가 목록으로 보기': 'View composer list',
  '작곡가들이 살았던 시간을 겹쳐 봐요. 누가 같은 시대를 살았는지 한눈에 보여요.':
    'See when composers lived, side by side, and who shared an era.',
  '작곡가 추가': 'Add composer',
  '작곡가를 불러오지 못했어요': "Couldn't load composers",
  '비교 영상 정보를 불러오지 못했어요': "Couldn't load comparison video info",
  '잠시 뒤 다시 시도하거나 주요 작곡가부터 둘러봐 주세요.':
    'Try again in a moment, or start with the major composers.',
  '보여 줄 작곡가가 아직 없어요': 'No composers to show yet',
  '다른 범위를 골라 보세요.': 'Try a different range.',
  '전체 작곡가 보기': 'See all composers',
  '10년마다 살았던 작곡가 수 · 누르면 그 해로 가요':
    'Composers alive per decade · Tap to jump to that year',
  '10년마다 살았던 작곡가 수 · 누르면 확대해요': 'Composers alive per decade · Tap to zoom in',
  '한 화면으로 접기': 'Fit to one screen',
  '{count}명은 시대별로 묶었어요':
    '{count} composer grouped by era|{count} composers grouped by era',
  '비교 영상 있음': 'Has comparison video',
  '사진은 대표 작곡가 · 막대는 생애': 'Photos: leading composers · Bars: lifespans',
  닫기: 'Close',
  '비교할 수 있는 작품 {count}곡': '{count} work to compare|{count} works to compare',
  '아직 비교할 수 있는 작품이 없어요': 'No works to compare yet',
  '비교 보기': 'See comparison',
  '작곡가 정보': 'Composer info',
  '{era} 작곡가 {count}명 더 보기':
    'See {count} more {era} composer|See {count} more {era} composers',
  '시대별 작곡가 밀도': 'Composer density by era',
  '누른 연도로 타임라인을 옮겨요': 'Moves the timeline to the year you tap',
  // 시대(작곡가 period 값이 한국어로 온다)
  중세: 'Medieval',
  르네상스: 'Renaissance',
  바로크: 'Baroque',
  고전주의: 'Classical',
  낭만주의: 'Romantic',
  근현대: 'Modern',
  '고전주의/낭만주의': 'Classical/Romantic',
  // 단수형 이름표. 「묶음 제목」은 복수(common 의 작곡가·연주자·작품), 한 건을 가리킬 때는 이쪽
  'kind::작곡가': 'Composer',
  'kind::연주자': 'Performer',
  'kind::작품': 'Work',
  'kind::앨범': 'Album',
  'kind::공연': 'Concert',
};
