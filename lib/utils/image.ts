const API_BASE = 'http://34.60.221.92:1028';

export function getImageUrl(
  path: string | undefined | null,
  defaultImage: string = 'https://via.placeholder.com/300x400?text=No+Image'
): string {
  if (!path) {
    return defaultImage;
  }

  // 로컬 파일 경로인 경우 (file://, content://, blob: 등)
  if (path.startsWith('file://') || path.startsWith('content://') || path.startsWith('blob:')) {
    return path;
  }

  // 이미 완전한 URL인 경우
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // 상대 경로인 경우 서버 URL과 결합
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = `${API_BASE}${cleanPath}`;
  return fullUrl;
}

// 절대 경로를 상대 경로로 변환 (DB 저장용)
export function toRelativePath(url: string | undefined | null): string | undefined {
  if (!url) {
    return undefined;
  }

  // 이미 상대 경로인 경우
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return url;
  }

  // API_BASE로 시작하는 경우 상대 경로로 변환
  if (url.startsWith(API_BASE)) {
    // http://34.60.221.92:1028/uploads/... -> /uploads/...
    const path = url.replace(API_BASE, '');
    return path.startsWith('/') ? path : `/${path}`;
  }

  // http://34.60.221.92:1028/uploads/... 형태도 처리 (포트 포함)
  const urlPattern = /^https?:\/\/[^\/]+(.*)$/;
  const match = url.match(urlPattern);
  if (match && match[1].startsWith('/uploads')) {
    return match[1];
  }

  // 다른 도메인의 URL인 경우 그대로 반환
  return url;
}
