import type { PageParams } from '@/shared/lib/types';

/** 공지 목록 행 (GET /admin/notices). */
export interface NoticeListItem {
  noticeId: number;
  title: string;
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
}

export type NoticeListParams = PageParams;

/** 전체 알림 발송 유형 (POST /admin/notifications/broadcast). */
export type BroadcastType = 'MAINTENANCE' | 'UPDATE' | 'EVENT' | 'NOTICE';

export interface BroadcastRequest {
  type: BroadcastType;
  title: string;
  body: string;
}
