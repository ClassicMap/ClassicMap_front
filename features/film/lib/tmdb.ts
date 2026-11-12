/**
 * TMDB 이미지 주소. 서버는 파일 경로("/abc.jpg")만 주고 크기는 화면이 고른다.
 * 서버에 사본을 두지 않고 image.tmdb.org 에서 바로 그린다(TMDB 약관상 오래 쌓아 두지 않는다).
 */
export type TmdbImageSize = 'w185' | 'w342' | 'w500' | 'w780' | 'w1280' | 'w300';

export function tmdbImageUrl(path: string | null | undefined, size: TmdbImageSize): string | null {
  if (!path || !path.startsWith('/')) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

/**
 * 권리자 공식 YouTube 클립의 썸네일. TMDB 이미지가 없을 때 장면 그림으로 쓴다.
 * maxresdefault 는 없는 영상도 있어 mqdefault(16:9, 위아래 띠 없음)를 대신 쓴다.
 */
export function youtubeClipThumbnail(videoId: string | null | undefined): { uri: string; fallback: string } | null {
  if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
  return {
    uri: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    fallback: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
  };
}
