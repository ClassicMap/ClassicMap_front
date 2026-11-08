/** 영어 사전: 레퍼토리·마이페이지·사용자 프로필. 키는 화면의 한국어 원문 그대로, 값은 영어. */
export const LIBRARY: Readonly<Record<string, string>> = {
  // 레퍼토리 탭
  '로그인하면 레퍼토리를 모을 수 있어요': 'Sign in to build your repertoire',
  '작곡가·연주자·작품·앨범·공연에서 레퍼토리에 담기를 누르면 여기에 모여요.':
    'Tap "Add to repertoire" on a composer, performer, work, album or concert and it will show up here.',
  로그인: 'Sign in',
  '레퍼토리를 불러오지 못했어요': "Couldn't load your repertoire",
  '아직 레퍼토리가 비어 있어요': 'Your repertoire is empty',
  '비교할 수 있는 작품 보기': 'See works to compare',
  // 목록
  '{date} 담음': 'Added {date}',
  '{label}만 보기': 'Show {label} only',
  '{count}개 모두 보기': 'See all {count}',
  // 담기 버튼·표시
  '{name} 레퍼토리에서 빼기': 'Remove {name} from repertoire',
  '{name} 레퍼토리에 담기': 'Add {name} to repertoire',
  '레퍼토리에 있어요': 'In repertoire',
  '레퍼토리에 담기': 'Add to repertoire',
  '레퍼토리에 반영하지 못했어요': "Couldn't update your repertoire",
  '연결이 잠시 끊겼을 수 있어요. 잠시 뒤 다시 눌러 주세요.':
    'The connection may have dropped. Please tap again in a moment.',
  '로그인이 필요해요': 'Sign in to continue',
  '로그인하면 레퍼토리에 담아 두고 언제든 다시 볼 수 있어요.':
    'Sign in to save items to your repertoire and come back to them anytime.',
};
