import { API_BASE_URL, authenticatedFetch } from '@/lib/api/client';
import type {
  ClipStatus,
  ComparisonPerformance,
  ComparisonPerformancePage,
  PerformanceCredit,
  PerformanceCreditRole,
} from '@/lib/types/models';

const CLIP_STATUSES: ReadonlySet<string> = new Set([
  'pending',
  'queued',
  'generating',
  'ready',
  'failed',
  'retired',
]);

const CREDIT_ROLES: ReadonlySet<string> = new Set([
  'soloist',
  'conductor',
  'orchestra',
  'ensemble',
  'accompanist',
  'vocalist',
  'other',
]);

interface ApiComparisonPerformance {
  id: number;
  sourceId: number;
  sectorId: number;
  pieceId: number;
  pieceTitle: string;
  composerId: number;
  composerName: string;
  sectorName: string;
  startMs: number;
  endMs: number;
  clipStatus: ClipStatus;
  clipUrl?: string | null;
  videoId?: string | null;
  credits: ApiPerformanceCredit[];
}

interface ApiPerformanceCredit {
  artistId: number;
  artistName: string;
  role: PerformanceCreditRole;
  isPrimary: boolean;
  displayOrder: number;
}

interface ApiComparisonPerformancePage {
  items: ApiComparisonPerformance[];
  nextCursor?: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireInteger(value: unknown, field: string): number {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new Error(`비교영상 응답의 ${field} 값이 올바르지 않습니다.`);
  }
  return Number(value);
}

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`비교영상 응답의 ${field} 값이 올바르지 않습니다.`);
  }
  return value;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`비교영상 응답의 ${field} 값이 올바르지 않습니다.`);
  }
  return value;
}

function parseCredit(value: unknown): PerformanceCredit {
  if (!isRecord(value)) {
    throw new Error('비교영상 크레딧 응답이 객체가 아닙니다.');
  }
  const role = requireString(value.role, 'credits.role');
  if (!CREDIT_ROLES.has(role)) {
    throw new Error(`지원하지 않는 연주 역할입니다: ${role}`);
  }
  if (typeof value.isPrimary !== 'boolean') {
    throw new Error('비교영상 응답의 credits.isPrimary 값이 올바르지 않습니다.');
  }

  return {
    artistId: requireInteger(value.artistId, 'credits.artistId'),
    artistName: requireString(value.artistName, 'credits.artistName'),
    displayOrder: requireNumber(value.displayOrder, 'credits.displayOrder'),
    isPrimary: value.isPrimary,
    role: role as PerformanceCreditRole,
  };
}

function parseComparison(value: unknown): ComparisonPerformance {
  if (!isRecord(value)) {
    throw new Error('비교영상 응답이 객체가 아닙니다.');
  }

  const clipStatus = requireString(value.clipStatus, 'clipStatus');
  if (!CLIP_STATUSES.has(clipStatus)) {
    throw new Error(`지원하지 않는 클립 상태입니다: ${clipStatus}`);
  }
  if (!Array.isArray(value.credits)) {
    throw new Error('비교영상 응답의 credits 값이 배열이 아닙니다.');
  }

  const startMs = requireNumber(value.startMs, 'startMs');
  const endMs = requireNumber(value.endMs, 'endMs');
  if (startMs < 0 || endMs <= startMs || endMs - startMs > 600_000) {
    throw new Error('비교영상 응답의 시작·종료 시간이 올바르지 않습니다.');
  }
  if (value.clipUrl !== undefined && value.clipUrl !== null && typeof value.clipUrl !== 'string') {
    throw new Error('비교영상 응답의 clipUrl 값이 올바르지 않습니다.');
  }
  if (
    value.videoId !== undefined &&
    value.videoId !== null &&
    (typeof value.videoId !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(value.videoId))
  ) {
    throw new Error('비교영상 응답의 videoId 값이 올바르지 않습니다.');
  }

  return {
    clipStatus: clipStatus as ClipStatus,
    clipUrl:
      typeof value.clipUrl === 'string' && value.clipUrl.trim() !== '' ? value.clipUrl : undefined,
    composerId: requireInteger(value.composerId, 'composerId'),
    composerName: requireString(value.composerName, 'composerName'),
    credits: value.credits
      .map(parseCredit)
      .sort((left, right) => left.displayOrder - right.displayOrder),
    endMs,
    id: requireInteger(value.id, 'id'),
    pieceId: requireInteger(value.pieceId, 'pieceId'),
    pieceTitle: requireString(value.pieceTitle, 'pieceTitle'),
    sectorId: requireInteger(value.sectorId, 'sectorId'),
    sectorName: requireString(value.sectorName, 'sectorName'),
    sourceId: requireInteger(value.sourceId, 'sourceId'),
    startMs,
    videoId: typeof value.videoId === 'string' ? value.videoId : undefined,
  };
}

function parsePage(payload: unknown): ComparisonPerformancePage {
  if (Array.isArray(payload)) {
    return { items: payload.map(parseComparison), nextCursor: null };
  }
  if (!isRecord(payload) || !Array.isArray(payload.items)) {
    throw new Error('비교영상 목록 응답 형식이 올바르지 않습니다.');
  }

  const page = payload as unknown as ApiComparisonPerformancePage;
  if (
    page.nextCursor !== undefined &&
    page.nextCursor !== null &&
    typeof page.nextCursor !== 'string'
  ) {
    throw new Error('비교영상 목록의 nextCursor 값이 올바르지 않습니다.');
  }

  return {
    items: page.items.map(parseComparison),
    nextCursor: page.nextCursor ?? null,
  };
}

export const ComparisonAPI = {
  async getByArtist(
    artistId: number,
    options: { cursor?: string | null; limit?: number } = {}
  ): Promise<ComparisonPerformancePage> {
    const params = new URLSearchParams({ limit: String(options.limit ?? 10) });
    if (options.cursor) {
      params.set('cursor', options.cursor);
    }

    const response = await authenticatedFetch(
      `${API_BASE_URL}/artists/${artistId}/comparison-performances?${params.toString()}`
    );
    if (response.status === 404 || response.status === 204) {
      return { items: [], nextCursor: null };
    }
    if (!response.ok) {
      throw new Error(`연주 비교 영상을 불러오지 못했습니다. (${response.status})`);
    }

    return parsePage(await response.json());
  },
};
