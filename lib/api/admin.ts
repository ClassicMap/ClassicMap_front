// lib/api/admin.ts
// Admin/Moderator 전용 API

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://34.60.221.92:1028/api';

// 인증 토큰 저장소
let authToken: string | null = null;

/**
 * 인증 토큰 설정 (client.ts와 동일한 토큰 사용)
 */
export const setAdminAuthToken = (token: string | null) => {
  authToken = token;
};

/**
 * 인증된 fetch 요청
 */
const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // 인증 토큰이 있으면 Authorization 헤더 추가
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
};

// Composer CRUD
export const AdminComposerAPI = {
  async create(data: {
    name: string;
    fullName: string;
    englishName: string;
    period: string;
    birthYear: number;
    deathYear: number;
    nationality: string;
    avatarUrl?: string;
    coverImageUrl?: string;
    bio?: string;
    style?: string;
    influence?: string;
  }): Promise<number> {
    const response = await authenticatedFetch(`${API_BASE_URL}/composers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create composer');
    return response.json();
  },

  async update(id: number, data: {
    name?: string;
    fullName?: string;
    englishName?: string;
    period?: string;
    birthYear?: number;
    deathYear?: number;
    nationality?: string;
    avatarUrl?: string;
    coverImageUrl?: string;
    bio?: string;
    style?: string;
    influence?: string;
  }): Promise<void> {
    const response = await authenticatedFetch(`${API_BASE_URL}/composers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update composer');
  },

  async delete(id: number): Promise<void> {
    const response = await authenticatedFetch(`${API_BASE_URL}/composers/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete composer');
  },
};

// Artist CRUD
export const AdminArtistAPI = {
  async create(data: {
    name: string;
    englishName: string;
    category: string;
    tier: string;
    nationality: string;
    rating?: number;
    imageUrl?: string;
    coverImageUrl?: string;
    birthYear?: string;
    bio?: string;
    style?: string;
    concertCount?: number;
    countryCount?: number;
    albumCount?: number;
  }): Promise<number> {
    // 이미지 URL을 상대 경로로 변환
    const processedData = {
      ...data,
      imageUrl: toRelativePath(data.imageUrl),
      coverImageUrl: toRelativePath(data.coverImageUrl),
    };
    
    const response = await authenticatedFetch(`${API_BASE_URL}/artists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(processedData),
    });
    if (!response.ok) throw new Error('Failed to create artist');
    return response.json();
  },

  async update(id: number, data: {
    name?: string;
    englishName?: string;
    category?: string;
    tier?: string;
    nationality?: string;
    rating?: number;
    imageUrl?: string;
    coverImageUrl?: string;
    birthYear?: string;
    bio?: string;
    style?: string;
    concertCount?: number;
    countryCount?: number;
    albumCount?: number;
  }): Promise<void> {
    // 이미지 URL을 상대 경로로 변환
    const processedData = {
      ...data,
      imageUrl: toRelativePath(data.imageUrl),
      coverImageUrl: toRelativePath(data.coverImageUrl),
    };
    
    const response = await authenticatedFetch(`${API_BASE_URL}/artists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(processedData),
    });
    if (!response.ok) throw new Error('Failed to update artist');
  },

  async delete(id: number): Promise<void> {
    const response = await authenticatedFetch(`${API_BASE_URL}/artists/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete artist');
  },

  async createAward(artistId: number, award: {
    year: string;
    awardName: string;
    displayOrder?: number;
  }): Promise<number> {
    const response = await authenticatedFetch(`${API_BASE_URL}/artists/${artistId}/awards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(award),
    });
    if (!response.ok) throw new Error('Failed to create award');
    return response.json();
  },

  async deleteAward(artistId: number, awardId: number): Promise<void> {
    const response = await authenticatedFetch(`${API_BASE_URL}/artists/${artistId}/awards/${awardId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete award');
  },
};

// Piece CRUD
export const AdminPieceAPI = {
  async create(data: {
    composerId: number;
    title: string;
    type: 'album' | 'song';
    description?: string;
    opusNumber?: string;
    compositionYear?: number;
    difficultyLevel?: number;
    durationMinutes?: number;
    spotifyUrl?: string;
    appleMusicUrl?: string;
    youtubeMusicUrl?: string;
  }): Promise<number> {
    const response = await authenticatedFetch(`${API_BASE_URL}/pieces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create piece');
    return response.json();
  },

  async update(id: number, data: {
    title?: string;
    type?: 'album' | 'song';
    description?: string;
    opusNumber?: string;
    compositionYear?: number;
    difficultyLevel?: number;
    durationMinutes?: number;
    spotifyUrl?: string;
    appleMusicUrl?: string;
    youtubeMusicUrl?: string;
  }): Promise<void> {
    const response = await authenticatedFetch(`${API_BASE_URL}/pieces/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update piece');
  },

  async delete(id: number): Promise<void> {
    const response = await authenticatedFetch(`${API_BASE_URL}/pieces/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete piece');
  },
};

// Concert CRUD
export const AdminConcertAPI = {
  async create(data: {
    title: string;
    composerInfo?: string;
    venueId: number;
    concertDate: string;
    concertTime?: string;
    priceInfo?: string;
    status: string;
  }): Promise<number> {
    const response = await authenticatedFetch(`${API_BASE_URL}/concerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create concert');
    return response.json();
  },

  async update(id: number, data: {
    title?: string;
    composerInfo?: string;
    venueId?: number;
    concertDate?: string;
    concertTime?: string;
    priceInfo?: string;
    posterUrl?: string;
    ticketUrl?: string;
    status?: string;
  }): Promise<void> {
    // 이미지 URL을 상대 경로로 변환
    const processedData = {
      ...data,
      posterUrl: toRelativePath(data.posterUrl),
    };

    const response = await authenticatedFetch(`${API_BASE_URL}/concerts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(processedData),
    });
    if (!response.ok) throw new Error('Failed to update concert');
  },

  async delete(id: number): Promise<void> {
    const response = await authenticatedFetch(`${API_BASE_URL}/concerts/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete concert');
  },
};

// Recording CRUD
export const AdminRecordingAPI = {
  async create(data: {
    artistId: number;
    title: string;
    year: string;
    label?: string;
    coverUrl?: string;
  }): Promise<number> {
    // 이미지 URL을 상대 경로로 변환
    const processedData = {
      ...data,
      coverUrl: toRelativePath(data.coverUrl),
    };

    const response = await authenticatedFetch(`${API_BASE_URL}/recordings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(processedData),
    });
    if (!response.ok) throw new Error('Failed to create recording');
    return response.json();
  },

  async update(id: number, data: {
    title?: string;
    year?: string;
    label?: string;
    coverUrl?: string;
  }): Promise<void> {
    // 이미지 URL을 상대 경로로 변환
    const processedData = {
      ...data,
      coverUrl: toRelativePath(data.coverUrl),
    };

    const response = await authenticatedFetch(`${API_BASE_URL}/recordings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(processedData),
    });
    if (!response.ok) throw new Error('Failed to update recording');
  },

  async delete(id: number): Promise<void> {
    const response = await authenticatedFetch(`${API_BASE_URL}/recordings/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete recording');
  },
};

// Performance CRUD
export const AdminPerformanceAPI = {
  async create(data: {
    pieceId: number;
    artistId: number;
    videoPlatform: string;
    videoId: string;
    startTime: number;
    endTime: number;
    characteristic?: string;
    recordingDate?: string;
    viewCount?: number;
    rating?: number;
  }): Promise<number> {
    const response = await authenticatedFetch(`${API_BASE_URL}/performances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create performance');
    return response.json();
  },

  async update(id: number, data: {
    pieceId?: number;
    artistId?: number;
    videoPlatform?: string;
    videoId?: string;
    startTime?: number;
    endTime?: number;
    characteristic?: string;
    recordingDate?: string;
    viewCount?: number;
    rating?: number;
  }): Promise<void> {
    const response = await authenticatedFetch(`${API_BASE_URL}/performances/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update performance');
  },

  async delete(id: number): Promise<void> {
    const response = await authenticatedFetch(`${API_BASE_URL}/performances/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete performance');
  },
};
