import type { Page } from '@/shared/lib/types';

/**
 * 서버 페이징 응답이 두 가지다.
 *
 *   Spring Page  — 회원 · 공지 · 커뮤니티 · 감사 로그
 *                  { content, number, size, totalElements, totalPages, pageable, sort, ... }
 *   평평한 형태   — 문의 · 자금 거래
 *                  { content, page, size, totalElements, totalPages }
 *
 * 화면은 우리 `Page<T>` 한 가지만 쓴다. 다른 점은 **현재 페이지 번호**뿐인데
 * Spring 쪽이 `page` 가 아니라 `number` 라, 그대로 쓰면 페이지네이션이 항상
 * 1페이지로 보인다. 실서버에서 확인한 차이다.
 */
export interface SpringPage<T> {
  content: T[];
  /** 현재 페이지 (0-base). 평평한 응답의 `page` 에 해당한다. */
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Spring Page 를 화면이 쓰는 모양으로 바꾼다. */
export function toPage<T>(data: SpringPage<T>): Page<T> {
  return {
    content: data.content,
    page: data.number,
    size: data.size,
    totalElements: data.totalElements,
    totalPages: data.totalPages,
  };
}
