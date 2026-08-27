import type { Page, PageParams } from '@/shared/lib/types';
import { DEFAULT_PAGE_SIZE } from '@/shared/lib/constants';

/**
 * 목(mock) API 공통 유틸.
 *
 * 백엔드가 붙기 전까지 각 feature 의 api.ts 가 이 유틸로 응답을 흉내 낸다.
 * 실제 네트워크처럼 보이도록 200~400ms 지연을 준다 (로딩 상태를 실제로 검증하기 위함).
 */

const MIN_DELAY = 200;
const MAX_DELAY = 400;

function randomDelay(): number {
  return MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
}

/** 지연 후 값을 돌려주는 Promise. */
export function mockResponse<T>(data: T, delayMs = randomDelay()): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), delayMs));
}

/** 배열을 명세 3.5 의 페이징 응답 형태로 자른다. page 는 0-base. */
export function paginate<T>(items: T[], params: PageParams = {}): Page<T> {
  const size = params.size ?? DEFAULT_PAGE_SIZE;
  const totalElements = items.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const page = Math.min(Math.max(params.page ?? 0, 0), totalPages - 1);
  const start = page * size;

  return {
    content: items.slice(start, start + size),
    page,
    size,
    totalElements,
    totalPages,
  };
}

/** 여러 필드를 대상으로 하는 대소문자 무시 부분 일치 검색. */
export function matchesKeyword<T>(item: T, keyword: string | undefined, fields: (keyof T)[]): boolean {
  if (!keyword?.trim()) return true;
  const needle = keyword.trim().toLowerCase();
  return fields.some((f) => String(item[f] ?? '').toLowerCase().includes(needle));
}
