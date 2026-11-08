/** 영어 사전: 앨범·녹음. 키는 화면의 한국어 원문 그대로, 값은 영어. */
export const ALBUM: Readonly<Record<string, string>> = {
  // 앨범 탭
  '연주자들의 음반을 발매 순으로 모았어요. 앨범 정보는 Apple Music 카탈로그 기준이에요.':
    "Performers' albums, newest first. Album info is based on the Apple Music catalog.",
  '앨범 제목이나 연주자 이름': 'Album title or performer',
  '앨범 찾기': 'Find albums',
  '담은 연주자의 새 앨범': 'New albums from your performers',
  '최근 90일 · 발매 예정 포함': 'Last 90 days · incl. upcoming',
  레이블: 'Label',
  '발매 연도': 'Release year',
  '{year}년': '{year}',
  '최신 발매': 'Newest',
  제목: 'Title',
  '최신 발매 순': 'Newest first',
  '제목 순': 'By title',
  '레퍼토리 연주자만': 'Repertoire performers only',
  '초기화 {count}': 'Reset {count}',
  '필터 초기화': 'Reset filters',
  '모든 레이블': 'All labels',
  '레이블을 불러오는 중이에요…': 'Loading labels…',
  '레이블 목록을 준비하고 있어요. 검색 칸에 레이블 이름을 넣어도 찾을 수 있어요.':
    'The label list is getting ready. You can also type a label name in the search box.',
  '레퍼토리에 담은 연주자가 없어요': 'No performers in your repertoire',
  '연주자 화면에서 레퍼토리에 담으면 그 연주자의 앨범만 모아 볼 수 있어요.':
    "Add a performer to your repertoire and you'll see just their albums here.",
  '연주자 둘러보기': 'Browse performers',
  '앨범 목록을 준비하고 있어요': "We're getting the album list ready",
  '앨범 찾기가 곧 열려요. 그동안 연주자 화면에서 연주자별 음반을 볼 수 있어요.':
    "Album search opens soon. Until then, you can see each performer's albums on their page.",
  '앨범을 불러오지 못했어요': "Couldn't load the albums",
  '‘{q}’에 맞는 앨범이 없어요': 'No albums match ‘{q}’',
  '이 조건에 맞는 앨범이 없어요': 'No albums match these filters',
  '레이블이나 발매 연도를 바꿔 보세요.': 'Try a different label or release year.',
  '레퍼토리 연주자 중 최근에 담은 12명의 앨범이에요.':
    'Albums from the 12 performers you added most recently.',
  // 앨범 카드·상세
  '발매 예정': 'Upcoming',
  '새 앨범': 'New',
  '{title}, {artist}{badge}. 앨범 정보 보기': '{title}, {artist}{badge}. View album info',
  '발매 예정일': 'Scheduled for',
  발매일: 'Released',
  트랙: 'Tracks',
  'track::{count}곡': '{count} track|{count} tracks',
  형태: 'Format',
  싱글: 'Single',
  모음집: 'Compilation',
  '앨범 정보 닫기': 'Close album info',
  '{title} 앨범 정보': 'Album info: {title}',
  닫기: 'Close',
  '{name} 아티스트 보기': 'View {name}',
  '들으러 가기': 'Listen',
  듣기: 'Listen',
  '연결된 스트리밍 링크가 아직 없어요. 쓰는 음악 앱에서 앨범 이름으로 찾아 주세요.':
    'No streaming links yet. Search for the album title in your music app.',
  '{service}에서 듣기, 새 창으로 열려요': 'Listen on {service}, opens in a new window',
  '{service}를 열지 못했어요': "Couldn't open {service}",
  '잠시 뒤 다시 눌러 주세요. 계속 안 되면 앱에서 앨범 이름으로 찾아 주세요.':
    "Try again in a moment. If it still doesn't work, search for the album title in the app.",
  '음원은 각 서비스에서 재생돼요. 앨범 정보는 Apple Music 카탈로그를 기준으로 해요.':
    'Music plays on each service. Album info is based on the Apple Music catalog.',
  // 아티스트 상세의 음반
  음반: 'Albums',
  '{count}장 · 최신순': '{count} album · newest first|{count} albums · newest first',
  '앨범 추가': 'Add album',
  '앨범 삭제': 'Delete album',
  '이 앨범을 삭제할까요?': 'Delete this album?',
  '등록된 음반이 없어요.': 'No albums yet.',
};
