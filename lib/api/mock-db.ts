// lib/api/mock-db.ts
// Mock 데이터베이스 (나중에 실제 API로 교체)

import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock 사용자 데이터
export interface User {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  isFirstLogin: boolean;
  preferences?: UserPreferences;
  createdAt: Date;
}

export interface UserPreferences {
  favoritePeriods: string[];
  favoriteGenres: string[];
  notificationEmail: boolean;
  notificationPush: boolean;
}

export interface FavoriteArtist {
  artistId: string;
  artistName: string;
  addedAt: Date;
}

export interface ConcertReview {
  concertId: string;
  concertTitle: string;
  rating: number;
  content: string;
  createdAt: Date;
}

// AsyncStorage 키
const KEYS = {
  USER_DATA: 'user_data',
  FAVORITE_ARTISTS: 'favorite_artists',
  CONCERT_REVIEWS: 'concert_reviews',
  COMMUNITY_POSTS: 'community_posts',
};

// 사용자 데이터 가져오기 (첫 로그인 체크)
export async function getUserProfile(clerkId: string): Promise<User | null> {
  try {
    const stored = await AsyncStorage.getItem(KEYS.USER_DATA);
    if (stored) {
      const user = JSON.parse(stored) as User;
      if (user.clerkId === clerkId) {
        return user;
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

// 사용자 생성 (첫 로그인 시)
export async function createUser(clerkUser: {
  id: string;
  emailAddresses: { emailAddress: string }[];
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string;
}): Promise<User> {
  const user: User = {
    clerkId: clerkUser.id,
    email: clerkUser.emailAddresses[0].emailAddress,
    firstName: clerkUser.firstName || undefined,
    lastName: clerkUser.lastName || undefined,
    imageUrl: clerkUser.imageUrl,
    isFirstLogin: true, // 첫 로그인!
    preferences: {
      favoritePeriods: [],
      favoriteGenres: [],
      notificationEmail: true,
      notificationPush: true,
    },
    createdAt: new Date(),
  };

  await AsyncStorage.setItem(KEYS.USER_DATA, JSON.stringify(user));
  return user;
}

// 첫 로그인 완료 처리
export async function completeFirstLogin(clerkId: string): Promise<void> {
  const user = await getUserProfile(clerkId);
  if (user) {
    user.isFirstLogin = false;
    await AsyncStorage.setItem(KEYS.USER_DATA, JSON.stringify(user));
  }
}

// 선호 설정 업데이트
export async function updatePreferences(
  clerkId: string,
  preferences: Partial<UserPreferences>
): Promise<void> {
  const user = await getUserProfile(clerkId);
  if (user) {
    user.preferences = { ...user.preferences!, ...preferences };
    await AsyncStorage.setItem(KEYS.USER_DATA, JSON.stringify(user));
  }
}

// 즐겨찾기 아티스트 추가
export async function addFavoriteArtist(
  artistId: string,
  artistName: string
): Promise<void> {
  const stored = await AsyncStorage.getItem(KEYS.FAVORITE_ARTISTS);
  const favorites: FavoriteArtist[] = stored ? JSON.parse(stored) : [];
  
  // 중복 체크
  if (!favorites.find(f => f.artistId === artistId)) {
    favorites.push({
      artistId,
      artistName,
      addedAt: new Date(),
    });
    await AsyncStorage.setItem(KEYS.FAVORITE_ARTISTS, JSON.stringify(favorites));
  }
}

// 즐겨찾기 아티스트 목록
export async function getFavoriteArtists(): Promise<FavoriteArtist[]> {
  const stored = await AsyncStorage.getItem(KEYS.FAVORITE_ARTISTS);
  return stored ? JSON.parse(stored) : [];
}

// 즐겨찾기 제거
export async function removeFavoriteArtist(artistId: string): Promise<void> {
  const stored = await AsyncStorage.getItem(KEYS.FAVORITE_ARTISTS);
  if (stored) {
    const favorites: FavoriteArtist[] = JSON.parse(stored);
    const filtered = favorites.filter(f => f.artistId !== artistId);
    await AsyncStorage.setItem(KEYS.FAVORITE_ARTISTS, JSON.stringify(filtered));
  }
}

// 공연 리뷰 추가
export async function addConcertReview(
  concertId: string,
  concertTitle: string,
  rating: number,
  content: string
): Promise<void> {
  const stored = await AsyncStorage.getItem(KEYS.CONCERT_REVIEWS);
  const reviews: ConcertReview[] = stored ? JSON.parse(stored) : [];
  
  reviews.push({
    concertId,
    concertTitle,
    rating,
    content,
    createdAt: new Date(),
  });
  
  await AsyncStorage.setItem(KEYS.CONCERT_REVIEWS, JSON.stringify(reviews));
}

// 공연 리뷰 목록
export async function getConcertReviews(): Promise<ConcertReview[]> {
  const stored = await AsyncStorage.getItem(KEYS.CONCERT_REVIEWS);
  return stored ? JSON.parse(stored) : [];
}

// 전체 데이터 초기화 (개발/테스트용)
export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([
    KEYS.USER_DATA,
    KEYS.FAVORITE_ARTISTS,
    KEYS.CONCERT_REVIEWS,
    KEYS.COMMUNITY_POSTS,
  ]);
}
