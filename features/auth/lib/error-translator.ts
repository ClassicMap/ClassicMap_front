import { msg, t } from '@/lib/i18n';

/**
 * Clerk 에러 메시지를 한국어로 변환하는 유틸리티. 영어 화면에서는 같은 문구를 영어로 옮긴다
 */

const ERROR_TRANSLATIONS: Record<string, string> = {
  // 패스워드 관련
  'password has been found in an online data breach': msg(
    '유출된 적 있는 비밀번호예요. 다른 비밀번호로 바꿔 주세요.'
  ),
  'password is too common': msg('너무 흔한 비밀번호예요. 다른 비밀번호로 바꿔 주세요.'),
  'password is too short': msg('비밀번호가 너무 짧아요. 8자 이상 입력해 주세요.'),
  'password is too long': msg('비밀번호가 너무 길어요. 조금 줄여 주세요.'),
  'password must contain at least': msg(
    '비밀번호 조건을 채우지 못했어요. 더 길고 복잡한 비밀번호로 다시 입력해 주세요.'
  ),
  'password is incorrect': msg(
    '비밀번호가 맞지 않아요. 다시 입력하거나 비밀번호 찾기를 눌러 주세요.'
  ),
  'passwords must be 8 characters or more': msg('비밀번호는 8자 이상이어야 해요.'),
  'enter password': msg('비밀번호를 입력해 주세요.'),

  // 이메일 관련
  'email address is invalid': msg('이메일 주소 형식이 맞지 않아요. 다시 확인해 주세요.'),
  'email address is already taken': msg('이미 가입된 이메일이에요. 로그인해 주세요.'),
  'identifier is invalid': msg('이메일 주소 형식이 맞지 않아요. 다시 확인해 주세요.'),
  'that email address is taken': msg('이미 가입된 이메일이에요. 로그인해 주세요.'),
  'enter email address': msg('이메일 주소를 입력해 주세요.'),
  'is missing': msg('이메일을 입력해 주세요.'),
  'is invalid': msg('이메일 주소 형식이 맞지 않아요. 다시 확인해 주세요.'),

  // 이름 관련
  'first name is required': msg('이름을 입력해 주세요.'),
  'last name is required': msg('성을 입력해 주세요.'),
  'first name is too short': msg('이름이 너무 짧아요.'),
  'last name is too short': msg('성이 너무 짧아요.'),
  'enter first name': msg('이름을 입력해 주세요.'),
  'enter last name': msg('성을 입력해 주세요.'),

  // 인증 관련
  'enter code': msg('메일로 받은 인증 코드를 입력해 주세요.'),
  'incorrect code': msg('인증 코드가 맞지 않아요. 메일을 다시 확인해 주세요.'),
  'verification code is incorrect': msg('인증 코드가 맞지 않아요. 메일을 다시 확인해 주세요.'),
  'verification code has expired': msg('인증 코드가 만료됐어요. 새 코드를 받아 주세요.'),
  'too many requests': msg('요청이 너무 많아요. 잠시 뒤 다시 시도해 주세요.'),
  'error loading captcha': msg(
    '보안 확인을 불러오지 못했어요. 광고 차단 확장 프로그램을 끄거나 다른 브라우저에서 다시 시도해 주세요.'
  ),

  // 계정 관련
  'account not found': msg('가입된 계정을 찾지 못했어요. 이메일을 확인하거나 회원가입해 주세요.'),
  "couldn't find your account": msg(
    '가입된 계정을 찾지 못했어요. 이메일을 확인하거나 회원가입해 주세요.'
  ),
  'invalid credentials': msg('이메일이나 비밀번호가 맞지 않아요. 다시 확인해 주세요.'),
  'user with this email address already exists': msg('이미 가입된 이메일이에요. 로그인해 주세요.'),
};

/**
 * Clerk 에러 메시지를 한국어로 변환
 */
export function translateClerkError(errorMessage: string): string {
  if (!errorMessage) return t('문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.');

  const lowerMessage = errorMessage.toLowerCase();
  // 마지막 마침표 제거 (어떤 메시지는 마침표가 있고 없고 다르므로)
  const messageWithoutDot = lowerMessage.replace(/\.$/, '');

  // 정확히 일치하는 번역 찾기
  for (const [key, translation] of Object.entries(ERROR_TRANSLATIONS)) {
    // 마침표를 무시하고 비교
    if (messageWithoutDot.includes(key) || lowerMessage.includes(key)) {
      return t(translation);
    }
  }

  // 번역이 없으면 원본 메시지 반환 (개발 중 디버깅용)
  return errorMessage;
}

/**
 * Clerk 에러 객체를 필드별 한국어 에러로 변환
 */
export function translateClerkErrors(errors: any[]): Record<string, string> {
  const translatedErrors: Record<string, string> = {};

  for (const error of errors) {
    const field = error.meta?.paramName || 'general';
    const message = error.message || error.longMessage || '';
    translatedErrors[field] = translateClerkError(message);
  }

  return translatedErrors;
}
