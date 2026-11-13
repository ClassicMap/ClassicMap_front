/** 영어 사전: 홈. 키는 화면의 한국어 원문 그대로, 값은 영어. */
export const HOME: Readonly<Record<string, string>> = {
  // 인사
  '좋은 아침이에요': 'Good morning',
  '좋은 오후예요': 'Good afternoon',
  '좋은 저녁이에요': 'Good evening',
  '편안한 밤이에요': 'Have a restful night',
  // 줄 제목
  '취향에 맞춘 비교': 'Comparisons for your taste',
  '아는 곡, 다르게 듣기': 'Pieces you know, heard differently',
  '처음 듣기 좋은 비교': 'Good first comparisons',
  '최근 본 작품': 'Recently viewed',
  '시대로 듣기': 'Listen by era',
  타임라인: 'Timeline',
  '전체 보기': 'See all',
  '{periods} 먼저': '{periods} first',
  '이번 주 공연': 'Concerts this week',
  '다가오는 공연': 'Upcoming concerts',
  // 오류·빈 화면
  '비교할 작품을 불러오지 못했어요': "Couldn't load the works to compare",
  '연주자를 불러오지 못했어요.': "Couldn't load performers.",
  '작곡가를 불러오지 못했어요.': "Couldn't load composers.",
  '공연을 불러오지 못했어요.': "Couldn't load concerts.",
  '예정된 공연이 없어요. 공연 탭에서 지역을 바꿔 보세요.':
    'No concerts scheduled. Try another region in the Concerts tab.',
  '추천에서 빼지 못했어요': "Couldn't remove it from your recommendations",
  '연결이 잠시 끊겼을 수 있어요. 잠시 뒤 다시 시도해 주세요.':
    'The connection may have dropped. Please try again in a moment.',
  // 취향 묻기 카드
  '취향을 알려 주면 홈이 달라져요': 'Tell us what you like and Home will adapt',
  '질문 네 개, 30초면 끝나요. 고른 답에 맞춰 오늘의 비교와 추천 셸프를 골라 드려요.':
    "Four questions, 30 seconds. We'll pick today's comparison and recommended shelves to match your answers.",
  '취향 알려 주기': 'Share my taste',
  괜찮아요: 'No thanks',
  // 고른 소리(홈 줄 옆 표시)
  오케스트라: 'Orchestra',
  '바이올린·첼로': 'Violin & cello',
  목소리: 'Voice',
  '작은 앙상블': 'Small ensemble',
  // 카드
  '이 곡을 추천에서 뺄까요?': 'Remove this piece from your recommendations?',
  '설정에서 들은 기록을 지우면 다시 보여요.':
    'Clear your listening history in Settings to see it again.',
  '관심 없음': 'Not interested',
  '{title} 관심 없음': 'Not interested in {title}',
  '{title} 일시정지': 'Pause {title}',
  '연주자 {count}': '{count} performer|{count} performers',
  '{name}, 레퍼토리에 있어요': '{name}, in your repertoire',
  '{name} 시대 타임라인 보기': 'See the {name} era on the timeline',
  '{title} 다시 보기': 'Revisit {title}',
  // 오늘의 비교
  '오늘의 비교': "Today's comparison",
  '연주자 정보 없음': 'Performer unknown',
  '{name} 연주 미리 보기': "Preview {name}'s performance",
  // 히어로
  '사진: {label}': 'Photo: {label}',
  '사진 출처: {label}': 'Photo credit: {label}',
  일시정지: 'Pause',
};
