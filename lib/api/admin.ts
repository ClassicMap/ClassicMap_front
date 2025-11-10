// lib/api/admin.ts
// Admin/Moderator 전용 API

import { toRelativePath } from '../utils/image';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://34.60.221.92:1028/api';

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
    imageUrl?: string;
    avatarUrl?: string;
    coverImageUrl?: string;
    bio?: string;
    style?: string;
    influence?: string;
  }): Promise<number> {
    // 이미지 URL을 상대 경로로 변환
    const processedData = {
      ...data,
      imageUrl: toRelativePath(data.imageUrl),
      avatarUrl: toRelativePath(data.avatarUrl),
      coverImageUrl: toRelativePath(data.coverImageUrl),
    };
    
    const response = await fetch(`${API_BASE_URL}/composers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(processedData),
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
    imageUrl?: string;
    avatarUrl?: string;
    coverImageUrl?: string;
    bio?: string;
    style?: string;
    influence?: string;
  }): Promise<void> {
    // 이미지 URL을 상대 경로로 변환
    const processedData = {
      ...data,
      imageUrl: toRelativePath(data.imageUrl),
      avatarUrl: toRelativePath(data.avatarUrl),
      coverImageUrl: toRelativePath(data.coverImageUrl),
    };
    
    const response = await fetch(`${API_BASE_URL}/composers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(processedData),
    });
    if (!response.ok) throw new Error('Failed to update composer');
  },

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/composers/${id}`, {
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
  }): Promise<number> {
    // 이미지 URL을 상대 경로로 변환
    const processedData = {
      ...data,
      imageUrl: toRelativePath(data.imageUrl),
      coverImageUrl: toRelativePath(data.coverImageUrl),
    };
    
    const response = await fetch(`${API_BASE_URL}/artists`, {
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
    
    const response = await fetch(`${API_BASE_URL}/artists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(processedData),
    });
    if (!response.ok) throw new Error('Failed to update artist');
  },

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/artists/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete artist');
  },
};

// Piece CRUD
export const AdminPieceAPI = {
  async create(data: {
    composer_id: number;
    title: string;
    description?: string;
    opus_number?: string;
    composition_year?: number;
    difficulty_level?: number;
    duration_minutes?: number;
  }): Promise<number> {
    const response = await fetch(`${API_BASE_URL}/pieces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create piece');
    return response.json();
  },

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/pieces/${id}`, {
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
    isRecommended: boolean;
    status: string;
  }): Promise<number> {
    const response = await fetch(`${API_BASE_URL}/concerts`, {
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
    isRecommended?: boolean;
    status?: string;
  }): Promise<void> {
    // 이미지 URL을 상대 경로로 변환
    const processedData = {
      ...data,
      posterUrl: toRelativePath(data.posterUrl),
    };
    
    const response = await fetch(`${API_BASE_URL}/concerts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(processedData),
    });
    if (!response.ok) throw new Error('Failed to update concert');
  },

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/concerts/${id}`, {
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

    const response = await fetch(`${API_BASE_URL}/recordings`, {
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

    const response = await fetch(`${API_BASE_URL}/recordings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(processedData),
    });
    if (!response.ok) throw new Error('Failed to update recording');
  },

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/recordings/${id}`, {
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
    const response = await fetch(`${API_BASE_URL}/performances`, {
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
    const response = await fetch(`${API_BASE_URL}/performances/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update performance');
  },

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/performances/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete performance');
  },
};
