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
    // 위키피디아/위키미디어 이미지는 프록시 경유
    if (path.includes('wikipedia.org') || path.includes('wikimedia.org')) {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || `${API_BASE}/api`;
      return `${apiUrl}/image-proxy?url=${encodeURIComponent(path)}`;
    }
    return path;
  }

  // 상대 경로인 경우 서버 URL과 결합
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = `${API_BASE}${cleanPath}`;
  return fullUrl;
}

const WIKIMEDIA_ORIGINAL =
  /^(https?:\/\/upload\.wikimedia\.org\/wikipedia\/[^/]+)\/([0-9a-f])\/([0-9a-f]{2})\/([^/?#]+)$/i;
const THUMBNAIL_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
/** 위키미디어가 캐시해 두는 표준 폭 중 하나. 초상은 최대 208px(2x 416px)로 그린다 */
const WIKIMEDIA_THUMB_WIDTH = 500;

/**
 * 위키미디어 원본 주소를 표준 폭 썸네일 주소로 바꾼다. 원본은 수십 MB도 있다
 * (베토벤 초상 원본 20MB). 이미 썸네일이거나 모양이 다르면 null.
 */
export function wikimediaThumbnailUrl(url: string, width = WIKIMEDIA_THUMB_WIDTH): string | null {
  const match = url.match(WIKIMEDIA_ORIGINAL);
  if (!match) return null;
  const [, base, first, second, file] = match;
  const extension = file.split('.').pop()?.toLowerCase() ?? '';
  if (!THUMBNAIL_EXTENSIONS.includes(extension)) return null;
  const thumbFile = extension === 'svg' ? `${width}px-${file}.png` : `${width}px-${file}`;
  return `${base}/thumb/${first}/${second}/${file}/${thumbFile}`;
}

/**
 * 화면에 그릴 때 시도할 주소를 순서대로 준다.
 * 위키미디어 원본은 썸네일을 먼저, 썸네일이 없으면(원본이 더 작을 때 등) 원본을 쓴다.
 */
export function getImageCandidates(path: string | undefined | null): string[] {
  if (!path) return [];
  const thumbnail = path.startsWith('http') ? wikimediaThumbnailUrl(path) : null;
  const urls = thumbnail ? [getImageUrl(thumbnail), getImageUrl(path)] : [getImageUrl(path)];
  return urls.filter((url, index) => urls.indexOf(url) === index);
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
