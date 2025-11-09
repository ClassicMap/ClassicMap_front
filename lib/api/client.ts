/**
 * API 클라이언트
 * 현재는 목 데이터를 반환하지만, 나중에 실제 API 호출로 쉽게 대체 가능
 */

import {
  COMPOSERS,
  PIECES,
  ARTISTS,
  PERFORMANCES,
  PERIODS,
  getMajorPiecesByComposer,
  getPerformancesByPiece,
  getPieceById,
  getComposerById,
  getArtistById,
  getComposersByPeriod,
} from '../data';

import type {
  Composer,
  Piece,
  Artist,
  Performance,
  Period,
  ComposerWithPieces,
  PieceWithPerformances,
  PerformanceWithArtist,
} from '../types/models';

// API Base URL (나중에 환경변수로 관리)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

// 실제 API 사용 여부 (개발 중에는 false)
const USE_REAL_API = false;

/**
 * 작곡가 API
 */
export const ComposerAPI = {
  /**
   * 모든 작곡가 조회
   */
  async getAll(): Promise<Composer[]> {
    if (USE_REAL_API) {
      const response = await fetch(`${API_BASE_URL}/composers`);
      return response.json();
    }
    // 목 데이터 반환
    return Promise.resolve(COMPOSERS);
  },

  /**
   * 작곡가 ID로 조회 (주요 곡 포함)
   */
  async getById(id: number): Promise<ComposerWithPieces | null> {
    if (USE_REAL_API) {
      const response = await fetch(`${API_BASE_URL}/composers/${id}`);
      return response.json();
    }
    // 목 데이터 반환
    const composer = getComposerById(id);
    if (!composer) return null;

    const majorPieces = getMajorPiecesByComposer(id);
    return Promise.resolve({
      ...composer,
      majorPieces,
    });
  },

  /**
   * 시대별 작곡가 조회
   */
  async getByPeriod(period: string): Promise<Composer[]> {
    if (USE_REAL_API) {
      const response = await fetch(`${API_BASE_URL}/composers?period=${period}`);
      return response.json();
    }
    // 목 데이터 반환
    return Promise.resolve(getComposersByPeriod(period));
  },
};

/**
 * 곡 API
 */
export const PieceAPI = {
  /**
   * 곡 ID로 조회 (연주 정보 포함)
   */
  async getById(id: number): Promise<PieceWithPerformances | null> {
    if (USE_REAL_API) {
      const response = await fetch(`${API_BASE_URL}/pieces/${id}`);
      return response.json();
    }
    // 목 데이터 반환
    const piece = getPieceById(id);
    if (!piece) return null;

    const composer = getComposerById(piece.composerId);
    if (!composer) return null;

    const performances = getPerformancesByPiece(id).map((perf) => {
      const artist = getArtistById(perf.artistId);
      return {
        ...perf,
        artist: artist!,
      };
    });

    return Promise.resolve({
      ...piece,
      composer,
      performances,
    });
  },

  /**
   * 작곡가의 모든 곡 조회
   */
  async getByComposer(composerId: number): Promise<Piece[]> {
    if (USE_REAL_API) {
      const response = await fetch(`${API_BASE_URL}/pieces?composerId=${composerId}`);
      return response.json();
    }
    // 목 데이터 반환
    return Promise.resolve(PIECES.filter((p) => p.composerId === composerId));
  },
};

/**
 * 아티스트 API
 */
export const ArtistAPI = {
  /**
   * 모든 아티스트 조회
   */
  async getAll(): Promise<Artist[]> {
    if (USE_REAL_API) {
      const response = await fetch(`${API_BASE_URL}/artists`);
      return response.json();
    }
    // 목 데이터 반환
    return Promise.resolve(ARTISTS);
  },

  /**
   * 아티스트 ID로 조회
   */
  async getById(id: number): Promise<Artist | null> {
    if (USE_REAL_API) {
      const response = await fetch(`${API_BASE_URL}/artists/${id}`);
      return response.json();
    }
    // 목 데이터 반환
    return Promise.resolve(getArtistById(id) || null);
  },
};

/**
 * 연주 API
 */
export const PerformanceAPI = {
  /**
   * 곡의 모든 연주 조회 (아티스트 정보 포함)
   */
  async getByPiece(pieceId: number): Promise<PerformanceWithArtist[]> {
    if (USE_REAL_API) {
      const response = await fetch(`${API_BASE_URL}/performances?pieceId=${pieceId}`);
      return response.json();
    }
    // 목 데이터 반환
    const performances = getPerformancesByPiece(pieceId);
    return Promise.resolve(
      performances.map((perf) => ({
        ...perf,
        artist: getArtistById(perf.artistId)!,
      }))
    );
  },
};

/**
 * 시대 정보 API
 */
export const PeriodAPI = {
  /**
   * 모든 시대 정보 조회
   */
  async getAll(): Promise<Period[]> {
    if (USE_REAL_API) {
      const response = await fetch(`${API_BASE_URL}/periods`);
      return response.json();
    }
    // 목 데이터 반환
    return Promise.resolve(PERIODS);
  },
};
