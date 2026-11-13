/** 영어 사전: 검색 화면과 빠른 검색(명령 팔레트). 키는 화면의 한국어 원문 그대로, 값은 영어. */
export const SEARCH: Readonly<Record<string, string>> = {
  // 검색 화면
  '작곡가, 작품, 연주자, 공연, 영화': 'Composers, works, performers, concerts, films',
  검색어: 'Search query',
  '영화·드라마': 'Film & TV',
  '“{q}”에 맞는 결과가 없어요': 'No results for “{q}”',
  '다른 표기나 영문 이름으로 찾아보세요.': 'Try a different spelling.',
  '일부 검색이 실패했어요. 눌러서 다시 시도해 주세요.': 'Some searches failed. Tap to try again.',
  '클래식 {count}곡': '{count} classical piece|{count} classical pieces',
  // 검색어가 없을 때 둘러보기
  '장르로 찾기': 'Browse by genre',
  '시대로 찾기': 'Browse by era',
  '악기·편성으로 찾기': 'Browse by instrument',
  '더 둘러보기': 'Explore more',
  '시대별로 추천 순': 'Recommended first, by era',
  '피아니스트부터 오케스트라까지': 'From pianists to orchestras',
  '담은 연주자의 새 앨범과 레이블별 음반': 'New albums from your performers, and records by label',
  '작곡가들이 살았던 시간을 겹쳐 봐요': 'See when composers lived, side by side',
  '같은 구간을 연주자별로 들어 봐요': 'Hear the same passage by different performers',
  '영화 속 클래식': 'Classical in film',
  '영화·드라마·애니에서 들은 그 곡': 'That piece from a film, show or anime',
  // 빠른 검색
  액션: 'Actions',
  '다크 모드 전환': 'Toggle dark mode',
  '검색 닫기': 'Close search',
  '빠른 검색': 'Quick search',
  '검색하는 중이에요.': 'Searching…',
  '작곡가, 작품, 아티스트, 공연 검색': 'Search composers, works, artists, concerts',
  '“{q}”에 맞는 결과가 없어요. 다른 이름이나 영문 표기로 찾아보세요.':
    'No results for “{q}”. Try another name or spelling.',
  '일부 검색이 실패했어요. 잠시 뒤 다시 입력해 보세요.':
    'Some searches failed. Try typing again in a moment.',
  이동: 'Navigate',
  열기: 'Open',
};
