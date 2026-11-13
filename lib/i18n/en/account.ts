/** 영어 사전: 로그인·가입·설정·도움말·온보딩·계정. 키는 화면의 한국어 원문 그대로, 값은 영어. */
export const ACCOUNT: Readonly<Record<string, string>> = {
  // 로그인·가입·비밀번호
  '레퍼토리와 별점을 어느 기기에서든 이어서 봐요.':
    'Pick up your repertoire and ratings on any device.',
  '또는 이메일로': 'Or use your email',
  이메일: 'Email',
  비밀번호: 'Password',
  '비밀번호를 잊었어요': 'Forgot your password?',
  '처음이에요?': 'New here?',
  회원가입: 'Sign up',
  '로그인 없이도 비교·검색·공연은 모두 볼 수 있어요.':
    'You can use comparison, search and concerts without signing in.',
  '레퍼토리와 별점을 남기려면 계정이 필요해요.':
    'You need an account to save a repertoire and ratings.',
  'family::성': 'Last name',
  'given::이름': 'First name',
  '8자 이상': 'At least 8 characters',
  '가입하고 인증 메일 받기': 'Sign up and get a verification email',
  '이미 계정이 있어요?': 'Already have an account?',
  '가입을 마치지 못했어요. 잠시 뒤 다시 시도하거나 다른 브라우저에서 가입해 주세요.':
    "Couldn't finish signing up. Try again in a moment or use a different browser.",
  '이메일 인증': 'Verify your email',
  '{email}로 보낸 인증 코드를 입력해 주세요. 메일이 안 보이면 스팸함도 확인해 주세요.':
    "Enter the verification code we sent to {email}. If you don't see it, check your spam folder.",
  '입력한 이메일': 'the email you entered',
  '인증 코드': 'Verification code',
  '인증하고 시작하기': 'Verify and get started',
  '코드 다시 받기': 'Resend code',
  '({n}초)': '({n}s)',
  '인증을 마치지 못했어요. 코드를 다시 받아 입력해 주세요.':
    "Couldn't finish verifying. Request a new code and enter it.",
  '비밀번호 찾기': 'Reset your password',
  '가입한 이메일로 인증 코드를 보내 드려요. 코드를 넣으면 새 비밀번호를 정할 수 있어요.':
    "We'll email a verification code to the address you signed up with. Enter it to set a new password.",
  '이메일을 입력해주세요': 'Enter your email.',
  '인증 코드 받기': 'Send verification code',
  '새 비밀번호 정하기': 'Set a new password',
  '메일로 받은 인증 코드를 넣고 새 비밀번호를 정해 주세요.':
    'Enter the verification code from your email and choose a new password.',
  '새 비밀번호': 'New password',
  '비밀번호 바꾸기': 'Change password',
  '재설정을 마치지 못했어요. 코드를 다시 받아 입력해 주세요.':
    "Couldn't finish the reset. Request a new code and enter it.",
  'Apple로 계속하기': 'Continue with Apple',
  'Google로 계속하기': 'Continue with Google',
  // Clerk 오류
  '유출된 적 있는 비밀번호예요. 다른 비밀번호로 바꿔 주세요.':
    'This password has appeared in a data breach. Choose a different one.',
  '너무 흔한 비밀번호예요. 다른 비밀번호로 바꿔 주세요.':
    'This password is too common. Choose a different one.',
  '비밀번호가 너무 짧아요. 8자 이상 입력해 주세요.':
    'Password is too short. Use at least 8 characters.',
  '비밀번호가 너무 길어요. 조금 줄여 주세요.': 'Password is too long. Shorten it a little.',
  '비밀번호 조건을 채우지 못했어요. 더 길고 복잡한 비밀번호로 다시 입력해 주세요.':
    "Password doesn't meet the requirements. Try a longer, more complex one.",
  '비밀번호가 맞지 않아요. 다시 입력하거나 비밀번호 찾기를 눌러 주세요.':
    'Incorrect password. Try again or use "Forgot your password?".',
  '비밀번호는 8자 이상이어야 해요.': 'Password must be at least 8 characters.',
  '비밀번호를 입력해 주세요.': 'Enter your password.',
  '이메일 주소 형식이 맞지 않아요. 다시 확인해 주세요.':
    "That doesn't look like a valid email address. Check it and try again.",
  '이미 가입된 이메일이에요. 로그인해 주세요.':
    'This email is already registered. Sign in instead.',
  '이메일 주소를 입력해 주세요.': 'Enter your email address.',
  '이메일을 입력해 주세요.': 'Enter your email.',
  '이름을 입력해 주세요.': 'Enter your first name.',
  '성을 입력해 주세요.': 'Enter your last name.',
  '이름이 너무 짧아요.': 'First name is too short.',
  '성이 너무 짧아요.': 'Last name is too short.',
  '메일로 받은 인증 코드를 입력해 주세요.': 'Enter the verification code from your email.',
  '인증 코드가 맞지 않아요. 메일을 다시 확인해 주세요.':
    "That code isn't right. Check your email and try again.",
  '인증 코드가 만료됐어요. 새 코드를 받아 주세요.': 'The code has expired. Request a new one.',
  '요청이 너무 많아요. 잠시 뒤 다시 시도해 주세요.': 'Too many requests. Try again in a moment.',
  '보안 확인을 불러오지 못했어요. 광고 차단 확장 프로그램을 끄거나 다른 브라우저에서 다시 시도해 주세요.':
    "Couldn't load the security check. Turn off your ad blocker or try another browser.",
  '가입된 계정을 찾지 못했어요. 이메일을 확인하거나 회원가입해 주세요.':
    "Couldn't find an account. Check your email or sign up.",
  '이메일이나 비밀번호가 맞지 않아요. 다시 확인해 주세요.':
    'Email or password is incorrect. Check and try again.',
  '문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.': 'Something went wrong. Try again in a moment.',
  // 사용자 메뉴
  '알 수 없는 오류': 'Unknown error',
  '로그아웃 실패': 'Sign-out failed',
  확인: 'OK',
  마이페이지: 'My page',
  '로그아웃 중...': 'Signing out…',
  로그아웃: 'Sign out',
  '로그아웃할까요?': 'Sign out?',
  '레퍼토리와 별점은 계정에 남아 있어요.': 'Your repertoire and ratings stay on your account.',
  // 마이페이지·공개 프로필
  사용자: 'User',
  '사용자 #{id}': 'User #{id}',
  '평가한 공연': 'Rated concerts',
  '평균 별점': 'Average rating',
  '별점 5점 공연': '5-star concerts',
  '최근 평가': 'Recent ratings',
  '보고싶은 공연': 'Concerts to see',
  '좋아하는 아티스트': 'Favorite artists',
  컬렉션: 'Collections',
  '평가한 공연을 불러오지 못했어요': "Couldn't load your rated concerts",
  '아직 평가한 공연이 없어요': 'No rated concerts yet',
  '다녀온 공연의 상세 화면에서 별점을 남기면 여기에 모여요.':
    'Rate a concert you attended on its detail page and it will show up here.',
  '공연 보러 가기': 'Browse concerts',
  '작곡가·연주자·작품·공연에서 레퍼토리에 담기를 누르면 여기에 모여요.':
    'Tap "Add to repertoire" on a composer, performer, work or concert and it will show up here.',
  '공개 프로필 보기': 'View public profile',
  설정: 'Settings',
  '공개 프로필': 'Public profile',
  '활동 요약은 비공개예요.': 'Activity summary is private.',
  비공개예요: 'Private',
  '프로필을 불러오지 못했어요': "Couldn't load the profile",
  '프로필을 찾을 수 없어요': 'Profile not found',
  '주소가 맞는지 확인해 주세요.': 'Check that the address is correct.',
  '이 사용자가 평가한 공연 목록을 공개하지 않았어요.':
    "This user hasn't made their rated concerts public.",
  '이 사용자가 레퍼토리 목록을 공개하지 않았어요.':
    "This user hasn't made their repertoire public.",
  '이 사용자가 컬렉션 목록을 공개하지 않았어요.': "This user hasn't made their collections public.",
  'profile::아직 레퍼토리가 비어 있어요': 'Nothing in the repertoire yet',
  '최근 평가순': 'Recently rated',
  '높은 별점순': 'Highest rated',
  '낮은 별점순': 'Lowest rated',
  공연일순: 'By concert date',
  '별점 {count}점': 'Rated {count} star|Rated {count} stars',
  '{title} 별점 {count}점': '{title}, rated {count} star|{title}, rated {count} stars',
  // 설정
  프로필: 'Profile',
  '공개 범위': 'Visibility',
  취향: 'Taste',
  화면: 'Display',
  계정: 'Account',
  정보: 'About',
  '활동 요약': 'Activity summary',
  '평가 수 · 평균 별점 · 레퍼토리 수': 'Number of ratings · average rating · repertoire size',
  '별점과 공연 목록': 'Star ratings and the concert list',
  '담아 둔 작곡가·연주자·작품·공연': 'Saved composers, performers, works and concerts',
  '별점 5점 공연처럼 자동으로 묶인 목록': 'Auto-grouped lists, like 5-star concerts',
  시스템: 'System',
  라이트: 'Light',
  다크: 'Dark',
  '공개 프로필과 마이페이지에 보이는 정보예요.': 'Shown on your public profile and My page.',
  '공개 프로필은 누구나 볼 수 있어요. 괜찮은 것만 켜 두세요.':
    "Anyone can see your public profile. Turn on only what you're comfortable sharing.",
  '공개 범위를 불러오지 못했어요.': "Couldn't load your visibility settings.",
  '홈의 오늘의 비교와 추천 셸프가 고른 답 쪽으로 기울어요.':
    "Home's daily comparison and recommended shelves lean toward your answers.",
  '시스템을 고르면 기기 설정을 따라가요.': 'System follows your device setting.',
  '평가·레퍼토리가 모두 지워져요': 'Ratings and repertoire will be erased',
  버전: 'Version',
  '표시 이름을 입력해 주세요.': 'Enter a display name.',
  '사진 주소는 https:// 로 시작해야 해요.': 'The photo URL must start with https://.',
  '저장하지 못했어요. 연결이 잠시 끊겼을 수 있어요. 잠시 뒤 다시 저장해 주세요.':
    "Couldn't save. The connection may have dropped. Try saving again in a moment.",
  '프로필 사진 주소': 'Profile photo URL',
  'https:// 로 시작하는 이미지 주소': 'Image URL starting with https://',
  '비워 두면 로그인 계정의 사진을 써요.': "Leave blank to use your sign-in account's photo.",
  '표시 이름': 'Display name',
  '한 줄 소개': 'Bio',
  '예: 라흐마니노프 협주곡을 연주자별로 모으고 있어요':
    'e.g. Collecting Rachmaninoff concertos by performer',
  '저장했어요.': 'Saved.',
  되돌리기: 'Revert',
  '저장 중…': 'Saving…',
  저장: 'Save',
  '공개 범위를 바꾸지 못했어요': "Couldn't change visibility",
  '{title} 공개': 'Show "{title}" on your public profile',
  '취향을 저장하지 못했어요': "Couldn't save your taste",
  '연결이 잠시 끊겼을 수 있어요. 잠시 뒤 다시 골라 주세요.':
    'The connection may have dropped. Try picking again in a moment.',
  '취향을 불러오지 못했어요.': "Couldn't load your taste answers.",
  '아직 취향을 알려 주지 않았어요': "You haven't shared your taste yet",
  '질문 네 개, 30초면 끝나요. 아는 곡과 좋아하는 연주자까지 고르면 홈 추천이 그쪽으로 맞춰져요.':
    'Four questions, about 30 seconds. Add pieces you know and performers you like, and Home recommendations adapt to them.',
  '클래식을 얼마나 들어요': 'How much do you listen to classical?',
  '끌리는 소리': "Sounds you're drawn to",
  '좋아하는 시대': 'Favorite eras',
  '아는 곡부터 다시 고르기': 'Pick again, starting with pieces you know',
  '기록 설정을 바꾸지 못했어요': "Couldn't change the history setting",
  '들은 기록을 지울까요?': 'Clear listening history?',
  '열어 본 곡, 끝까지 들은 곡, 관심 없음으로 뺀 곡이 모두 지워져요.':
    'Pieces you opened, finished, or marked not interested will all be erased.',
  지우기: 'Clear',
  '들은 기록을 지웠어요': 'Listening history cleared',
  '홈 추천이 고른 답만으로 다시 골라져요.': 'Home recommendations will now use only your answers.',
  '기록을 지우지 못했어요': "Couldn't clear your history",
  '들은 기록으로 추천 고치기': 'Tune recommendations with listening history',
  '열어 본 곡, 끝까지 들은 곡, 금방 넘긴 곡을 추천에 써요. 끄면 관심 없음만 기억해요.':
    'Pieces you opened, finished, or skipped quickly shape your recommendations. Turn off to remember only "not interested".',
  '지우는 중…': 'Clearing…',
  '들은 기록 지우기': 'Clear listening history',
  // 계정 이름·비밀번호·삭제
  '계정 이름': 'Account name',
  '로그인 계정에 쓰는 이름이에요. 공개 프로필에 보이는 이름은 설정 > 프로필에서 따로 바꿔요.':
    'The name on your sign-in account. Change the name on your public profile under Settings > Profile.',
  '이름을 바꾸지 못했어요. 잠시 뒤 다시 시도해 주세요.':
    "Couldn't change your name. Try again in a moment.",
  '성과 이름을 모두 입력해 주세요.': 'Enter both your last name and first name.',
  '이름을 바꿨어요.': 'Name updated.',
  '이메일 주소는 계정 보안 때문에 바꿀 수 없어요.':
    "For account security, your email address can't be changed.",
  '비밀번호 변경': 'Change password',
  '이메일로 가입한 계정의 비밀번호를 바꿔요.':
    'Change the password of an account created with email.',
  '비밀번호를 바꾸지 못했어요. 현재 비밀번호를 확인한 뒤 다시 시도해 주세요.':
    "Couldn't change your password. Check your current password and try again.",
  '세 칸을 모두 입력해 주세요.': 'Fill in all three fields.',
  '새 비밀번호는 {min}자 이상으로 정해 주세요.':
    'Your new password must be at least {min} characters.',
  '새 비밀번호 두 칸이 달라요. 다시 입력해 주세요.':
    "The two new passwords don't match. Enter them again.",
  '현재 비밀번호': 'Current password',
  '{min}자 이상': 'At least {min} characters',
  '새 비밀번호 확인': 'Confirm new password',
  '비밀번호를 바꿨어요.': 'Password updated.',
  '바꾸는 중…': 'Changing…',
  '계정 삭제': 'Delete account',
  '계정을 지우면 별점, 레퍼토리, 공개 프로필이 모두 사라지고 되돌릴 수 없어요.':
    'Deleting your account erases your ratings, repertoire and public profile for good.',
  '지워지는 것': 'What will be erased',
  '로그인 계정({email}), 남긴 별점, 레퍼토리, 공개 프로필 설정, 취향 답과 들은 기록':
    'Your sign-in account ({email}), ratings, repertoire, public profile settings, taste answers and listening history',
  '확인을 위해 "{word}"를 입력해 주세요': 'Type "{word}" to confirm',
  '입력어::삭제': 'delete',
  '삭제 중…': 'Deleting…',
  '메일로 삭제 요청': 'Request deletion by email',
  '계정을 삭제할까요?': 'Delete your account?',
  '평가와 레퍼토리가 모두 지워지고 되돌릴 수 없어요.':
    'Your ratings and repertoire will be erased for good.',
  'ClassicMap 계정 삭제 요청': 'ClassicMap account deletion request',
  '계정 삭제를 요청합니다.\n\n이메일: {email}\n삭제 사유: ':
    'I would like to request deletion of my account.\n\nEmail: {email}\nReason: ',
  '메일 앱을 열지 못했어요. {email}로 직접 보내 주세요.':
    "Couldn't open your mail app. Please email {email} directly.",
  '기록은 지웠지만 로그인 계정을 지우지 못했어요. 잠시 뒤 다시 시도하거나 메일로 요청해 주세요.':
    "Your data was erased, but we couldn't delete your sign-in account. Try again in a moment or request deletion by email.",
  '이 계정은 앱에서 바로 지울 수 없어요. 아래 버튼으로 {email}에 삭제를 요청해 주세요.':
    "This account can't be deleted in the app. Use the button below to request deletion at {email}.",
  '계정을 지우지 못했어요. 잠시 뒤 다시 시도하거나 메일로 요청해 주세요.':
    "Couldn't delete your account. Try again in a moment or request deletion by email.",
  // 도움말
  도움말: 'Help',
  '자주 묻는 질문': 'Frequently asked questions',
  'ClassicMap은 무엇을 하는 앱인가요?': 'What is ClassicMap?',
  '같은 곡의 같은 구간을 여러 연주자로 이어 들으며 비교하는 앱이에요. 작곡가·연주자·작품·공연 정보도 함께 볼 수 있어요.':
    'ClassicMap lets you compare performers by listening to the same section of the same piece back to back. You can also browse composers, performers, works and concerts.',
  '비교는 어떻게 하나요?': 'How does comparing work?',
  '비교 탭에서 작품을 고르면 구간 칩과 연주자 목록이 나와요. 연주자를 누르면 그 연주의 해당 구간만 재생되고, 데스크톱에서는 ←→ 키로 같은 지점에서 연주자를 바꿔 들을 수 있어요.':
    'Pick a work in the Compare tab to see section chips and a list of performers. Tap a performer to play just that section of their performance. On desktop, use the ← → keys to switch performers at the same point.',
  '영상은 어디서 가져오나요?': 'Where do the videos come from?',
  '연주 영상은 YouTube 원본의 해당 구간이에요. 비교 화면의 "YouTube 원본" 링크로 전체 영상을 볼 수 있어요.':
    'Each clip is the matching section of the original YouTube video. Use the "YouTube original" link on the compare screen to watch the full video.',
  '공연 정보는 어디서 오나요?': 'Where does concert information come from?',
  'KOPIS 공연예술통합전산망의 공개 데이터를 매일 받아 와요. 예매는 각 예매처로 연결돼요.':
    'We import public data from KOPIS (Korea Performing Arts Information System) every day. Booking links go to each ticket seller.',
  '레퍼토리는 무엇인가요?': 'What is the repertoire?',
  '작곡가·연주자·작품·공연에서 "레퍼토리에 담기"를 누르면 모이는 나만의 목록이에요. 로그인하면 어느 기기에서든 이어서 볼 수 있어요.':
    'It is your own list, built when you tap "Add to repertoire" on a composer, performer, work or concert. Sign in to see it on any device.',
  '계정은 어떻게 삭제하나요?': 'How do I delete my account?',
  '설정 > 계정 > 계정 삭제에서 지울 수 있어요. 지우면 별점과 레퍼토리가 모두 사라지고 되돌릴 수 없어요.':
    'Go to Settings > Account > Delete account. Your ratings and repertoire will be erased and this cannot be undone.',
  '메일 앱을 열지 못했어요': "Couldn't open your mail app",
  '{email}로 직접 보내 주세요.': 'Please email {email} directly.',
  문의: 'Contact',
  '답은 {email}로 보내 드려요.': 'Replies come from {email}.',
  'ClassicMap 문의': 'ClassicMap inquiry',
  '메일로 문의하기': 'Email us',
  'ClassicMap 문제 신고': 'ClassicMap problem report',
  '문제 내용:\n\n\n발생 시점:\n\n\n기기 정보:\n\n':
    'What happened:\n\n\nWhen it happened:\n\n\nDevice info:\n\n',
  '문제 신고하기': 'Report a problem',
  '약관 및 정책': 'Terms and policies',
  // 찾는 화면 없음
  '찾는 화면이 없어요': "We can't find that screen",
  '주소가 바뀌었거나 없어진 화면이에요.':
    'The address may have changed, or the screen no longer exists.',
  홈으로: 'Go to Home',
  // 취향 묻기(온보딩)
  이전: 'Back',
  건너뛰기: 'Skip',
  시작하기: 'Get started',
  다음: 'Next',
  '{total}단계 중 {step}단계': 'Step {step} of {total}',
  '나중에 할게요': 'Maybe later',
  '클래식, 얼마나 들어요?': 'How much classical do you listen to?',
  '답에 따라 처음 열어 드릴 곡과 구간이 달라져요.':
    'Your answer changes the pieces and sections we show first.',
  '어떤 악기를 연주해요?': 'Which instrument do you play?',
  '어떤 소리에 끌려요?': 'Which sounds draw you in?',
  '여러 개 골라도 돼요. 고른 소리마다 한 곡씩은 꼭 보여 드려요.':
    "Pick as many as you like. We'll show at least one piece for each sound you choose.",
  '아는 곡이 있으면 골라 주세요': 'Pick any pieces you know',
  '하나도 없어도 괜찮아요. 고른 곡과 닮은 곡을 먼저 보여 드려요.':
    "It's fine if you don't know any. We'll show pieces similar to your picks first.",
  '곡 목록을 불러오지 못했어요. 이 장은 건너뛰어도 괜찮아요.':
    "Couldn't load the list of pieces. You can skip this step.",
  '좋아하는 연주자나 작곡가가 있어요?': 'Any performers or composers you love?',
  '고르면 레퍼토리에 담아 두고, 그 사람이 나오는 비교를 앞에 보여 드려요.':
    "We'll add them to your repertoire and show comparisons featuring them first.",
  '이름으로 찾기': 'Search by name',
  '맞는 사람이 없어요. 다른 이름으로 찾아 보세요.': 'No one matches. Try a different name.',
  '이런 연주자는 어때요': 'How about these performers',
  '이제 막 듣기 시작했어요': "I've just started listening",
  '이제 막': 'Just started',
  '좋아하는 곡이 몇 개 있어요': 'I have a few favorites',
  '몇 곡 알아요': 'Know a few',
  '자주 찾아 들어요': 'I listen often',
  '자주 들어요': 'Listen often',
  '직접 연주해요': 'I play an instrument',
  'chip::직접 연주해요': 'I play',
  현악기: 'Strings',
  관악기: 'Winds',
  'instrument::성악': 'Voice',
  '그 밖의 악기': 'Other instrument',
  '취향을 불러오지 못했어요': "Couldn't load your taste",
  '연결이 잠시 끊겼을 수 있어요. 다시 시도하거나 나중에 설정에서 골라 주세요.':
    'The connection may have dropped. Try again, or pick later in Settings.',
};
