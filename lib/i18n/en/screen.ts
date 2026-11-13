/** 영어 사전: 영화 속 클래식. 키는 화면의 한국어 원문 그대로, 값은 영어. */
export const SCREEN: Readonly<Record<string, string>> = {
  // 작품 종류·쓰임
  'kind::영화': 'Movie',
  'kind::드라마·시리즈': 'TV series',
  'kind::드라마': 'TV',
  'kind::애니': 'Anime',
  배경음악: 'Background music',
  '화면 속 음악': 'On-screen music',
  '인물이 연주': 'Played by a character',
  '오프닝·엔딩': 'Opening & ending',
  'cue::편곡': 'Arranged',
  '{n}화': 'Ep. {n}',
  '시즌 {season} · {n}화': 'Season {season} · Ep. {n}',
  '{hours}시간 {minutes}분쯤': '~{hours} h {minutes} min',
  '{hours}시간쯤': '~{hours} h',
  '{minutes}분쯤': '~{minutes} min',
  // 목록 화면(필터 칩·보기 전환은 문맥을 붙였다)
  'chip::영화': 'Movies',
  'chip::드라마·시리즈': 'TV series',
  'chip::애니': 'Anime',
  'film::작품': 'Titles',
  'film::곡': 'Pieces',
  'film::{count}곡': '{count} piece|{count} pieces',
  '영화 속 클래식': 'Classical music in films and TV',
  '영화 속 클래식 모두 보기': 'See all classical music in films and TV',
  '영화 속 클래식 보기': 'Browse films and TV',
  '영화·드라마·애니에서 들은 그 곡을 찾고, 나온 대목을 여러 연주로 들어 봐요.':
    'Find the piece you heard in a film, show, or anime, then hear that passage in different performances.',
  '작품 제목이나 곡 이름': 'Title or piece name',
  '영화·드라마 검색어': 'Search films and TV',
  '찾는 방법': 'Browse by',
  '작곡가별로 영화에 나온 곡을 모았어요.': 'Pieces used in films and TV, grouped by composer.',
  '그 대목 바로 듣기': 'Hear that passage',
  '영화에 나온 대목을 그대로 비교할 수 있어요.': 'Compare the exact passage used on screen.',
  '“{query}” 검색 결과': 'Results for “{query}”',
  '작품을 불러오지 못했어요': "Couldn't load the titles",
  '“{query}”가 나온 작품을 아직 못 찾았어요': 'No titles found for “{query}” yet',
  '아직 정리한 작품이 없어요': 'No titles added yet',
  '다른 제목이나 곡 이름으로 찾아보세요.': 'Try another title or piece name.',
  '근거를 확인한 작품부터 하나씩 채우고 있어요.':
    "We're adding entries one by one, starting with the ones we've verified.",
  '작품 더 보기': 'Show more titles',
  '{title}, {meta}, 클래식 {count}곡':
    '{title}, {meta}, {count} classical piece|{title}, {meta}, {count} classical pieces',
  '{title}에 나온 {composer} {work} 비교해 듣기':
    'Compare performances of {composer} {work}, from {title}',
  '포스터는 한국영상자료원 KMDb에서 가져와요.': 'Posters are from KMDb (Korean Film Archive).',
  '포스터가 없는 작품은 배급사·방송사·OTT 공식 YouTube 예고편과 클립의 장면을 보여 줘요.':
    'Titles without a poster show a frame from an official YouTube trailer or clip from the distributor, broadcaster, or streaming service.',
  // 곡으로 찾기
  '곡 목록을 불러오지 못했어요': "Couldn't load the pieces",
  '아직 정리한 곡이 없어요': 'No pieces added yet',
  '곡 더 보기': 'Show more pieces',
  '{composer} {work} 비교해 듣기': 'Compare performances of {composer} {work}',
  // 작품 페이지
  '찾는 작품이 없어요': 'Title not found',
  '목록에서 다른 작품을 골라 주세요.': 'Pick another title from the list.',
  '{title} 스틸': 'Still from {title}',
  '나온 클래식 {count}곡': '{count} classical piece|{count} classical pieces',
  '비교 연주는 영화에 쓰인 녹음과 다를 수 있어요.':
    'Comparison performances may differ from the recording used on screen.',
  '곡 정보 일부는 한국영상자료원 KMDb를 참고했어요.':
    'Some piece details are based on KMDb (Korean Film Archive).',
  "장면 그림은 권리자가 YouTube에 올린 공식 영상의 장면이에요. 'YouTube · 채널'을 누르면 그 영상이 열려요.":
    "Scene images are frames from official videos that the rights holder uploaded to YouTube. Tap 'YouTube · channel' to open the video.",
  '포스터와 스틸은 TMDB에서 가져와요. 이 앱은 TMDB와 TMDB API를 쓰지만 TMDB의 보증·인증·승인을 받지는 않았어요.':
    'Posters and stills are from TMDB. This app uses TMDB and the TMDB API but is not endorsed, certified, or otherwise approved by TMDB.',
  '{title} 포스터': '{title} poster',
  '{title} 공식 클립 장면': 'Scene from the official {title} clip',
  // 비교 화면 아래 띠
  'strip::모두 보기': 'See all',
  '이 구간': 'This section',
  '지금 구간이 나와요': 'Uses this section',
  '포스터: 한국영상자료원 KMDb': 'Posters: KMDb (Korean Film Archive)',
  // 곡 카드
  '링크를 열지 못했어요': "Couldn't open the link",
  '{work} 장면 스틸': '{work} scene still',
  '{work}이 나오는 장면': 'Scene featuring {work}',
  '이 장면에서 나와요': 'Heard in this scene',
  '근거 {count}개': '{count} source|{count} sources',
  'cue::1차': 'Primary',
  'cue::2차': 'Secondary',
  'YouTube {channel}에서 장면 보기': 'Watch the scene on YouTube ({channel})',
  '{label}에서 듣기': 'Listen on {label}',
  '아직 ClassicMap에 없는 곡이에요.': "This piece isn't on ClassicMap yet.",
  'cue::일시정지': 'Pause',
  'cue::바로 듣기': 'Play',
  'cue::대표 연주': 'Featured performance',
  '연주 불러오는 중…': 'Loading performances…',
  '지금 바로 들을 연주가 없어요': 'No performance to play yet',
  '{work} {artist} 연주 {action}': "{action} {artist}'s performance of {work}",
  '{work} 대표 연주 {action}': '{action} the featured performance of {work}',
  '다른 연주와 비교': 'Compare with other performances',
  '다른 연주와 비교 · {count}개': 'Compare with other performances · {count}',
  '영화에 나온 대목은 아직 비교 구간이 없어 같은 곡의 다른 구간을 들려줘요.':
    "This passage from the film isn't a comparison section yet, so you'll hear another section of the same piece.",
  // 관리자 스틸 고르기
  '스틸 고르기': 'Choose still',
  '스틸 빼기': 'Remove still',
  '스틸을 저장하지 못했어요': "Couldn't save the still",
  'cue::닫기': 'Close',
  '불러오는 중이에요.': 'Loading…',
  '스틸 후보를 불러오지 못했어요. 창을 닫고 다시 열어 주세요.':
    "Couldn't load still candidates. Close this window and open it again.",
  'TMDB 스틸 후보가 아직 없어요. 이미지 갱신 작업을 먼저 돌려 주세요.':
    'No TMDB still candidates yet. Run the image refresh job first.',
};
