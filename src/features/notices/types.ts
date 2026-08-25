import type { PageParams } from '@/shared/lib/types';

/** 공지 목록 행 (GET /admin/notices). */
export interface NoticeListItem {
  noticeId: number;
  title: string;
  /** 모바일 공지 페이지 노출 여부 */
  exposeMobile: boolean;
  authorName: string;
  /** 첨부파일 / 링크 개수 (목록에서는 개수만 보여준다) */
  attachmentCount: number;
  linkCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 공지 상세 (GET /admin/notices/{id}). */
export interface NoticeDetail extends NoticeListItem {
  content: string;
  attachments: string[];
  links: string[];
}

/** POST /admin/notices · PATCH /admin/notices/{id} 요청 본문. */
export interface NoticeRequest {
  title: string;
  content: string;
  attachments?: string[];
  links?: string[];
  exposeMobile?: boolean;
}

export interface NoticeListParams extends PageParams {
  /** 모바일 노출 여부 필터 (화면 편의용) */
  exposeMobile?: 'ALL' | 'EXPOSED' | 'HIDDEN';
}

/** 전체 알림 발송 유형 (POST /admin/notifications/broadcast). */
export type BroadcastType = 'MAINTENANCE' | 'UPDATE' | 'EVENT' | 'NOTICE';

export interface BroadcastRequest {
  type: BroadcastType;
  title: string;
  body: string;
}
