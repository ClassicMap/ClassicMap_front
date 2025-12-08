/**
 * Clerk 에러 메시지를 한국어로 변환하는 유틸리티
 */

const ERROR_TRANSLATIONS: Record<string, string> = {
  // 패스워드 관련
  'password has been found in an online data breach': '비밀번호가 너무 흔하거나 쉽습니다. 더 안전한 비밀번호를 사용해주세요.',
  'password is too common': '비밀번호가 너무 흔합니다. 다른 비밀번호를 사용해주세요.',
  'password is too short': '비밀번호가 너무 짧습니다. 최소 8자 이상 입력해주세요.',
  'password is too long': '비밀번호가 너무 깁니다.',
  'password must contain at least': '비밀번호는 다음을 포함해야 합니다:',
  'password is incorrect': '비밀번호가 올바르지 않습니다.',
  'passwords must be 8 characters or more': '비밀번호는 8자 이상이어야 합니다.',
  'enter password': '비밀번호를 입력해주세요.',

  // 이메일 관련
  'email address is invalid': '유효하지 않은 이메일 주소입니다.',
  'email address is already taken': '이미 사용 중인 이메일 주소입니다.',
  'identifier is invalid': '유효하지 않은 이메일 주소입니다.',
  'that email address is taken': '이미 사용 중인 이메일 주소입니다.',
  'enter email address': '이메일 주소를 입력해주세요.',
  'is missing': '이메일을 입력해주세요.',
  'is invalid': '이메일이 유효하지 않습니다.',

  // 이름 관련
  'first name is required': '이름을 입력해주세요.',
  'last name is required': '성을 입력해주세요.',
  'first name is too short': '이름이 너무 짧습니다.',
  'last name is too short': '성이 너무 짧습니다.',
  'enter first name': '이름을 입력해주세요.',
  'enter last name': '성을 입력해주세요.',

  // 인증 관련
  'incorrect code': '인증 코드가 올바르지 않습니다.',
  'verification code is incorrect': '인증 코드가 올바르지 않습니다.',
  'verification code has expired': '인증 코드가 만료되었습니다. 새 코드를 요청해주세요.',
  'too many requests': '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',

  // 계정 관련
  'account not found': '계정을 찾을 수 없습니다.',
  "couldn't find your account": '계정을 찾을 수 없습니다.',
  'invalid credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'user with this email address already exists': '이미 가입된 이메일 주소입니다.',
};

/**
 * Clerk 에러 메시지를 한국어로 변환
 */
export function translateClerkError(errorMessage: string): string {
  if (!errorMessage) return '오류가 발생했습니다. 다시 시도해주세요.';

  const lowerMessage = errorMessage.toLowerCase();
  // 마지막 마침표 제거 (어떤 메시지는 마침표가 있고 없고 다르므로)
  const messageWithoutDot = lowerMessage.replace(/\.$/, '');

  // 정확히 일치하는 번역 찾기
  for (const [key, translation] of Object.entries(ERROR_TRANSLATIONS)) {
    // 마침표를 무시하고 비교
    if (messageWithoutDot.includes(key) || lowerMessage.includes(key)) {
      return translation;
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
