/**
 * TMDB 이미지 주소. 서버는 파일 경로("/abc.jpg")만 주고 크기는 화면이 고른다.
 * 서버에 사본을 두지 않고 image.tmdb.org 에서 바로 그린다(TMDB 약관상 오래 쌓아 두지 않는다).
 */
export type TmdbImageSize = 'w185' | 'w342' | 'w500' | 'w780' | 'w1280' | 'w300';

export function tmdbImageUrl(path: string | null | undefined, size: TmdbImageSize): string | null {
  if (!path || !path.startsWith('/')) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
