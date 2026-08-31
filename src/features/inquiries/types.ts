import type { PageParams } from '@/shared/lib/types';

/**
 * 1:1 문의 (API 명세 5.4).
 *
 * NOTE: 상태는 status 문자열이 아니라 answered(Boolean) 이다.
 */

/** GET /admin/inquiries 의 원소. */
export interface InquiryListItem {
  id: number;
  memberId: number;
  memberNickname: string;
  title: string;
  answered: boolean;
  createdAt: string;
}

/** 답변 (GET /admin/inquiries/{id} 의 data.answer). */
export interface InquiryAnswer {
  id: number;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/** GET /admin/inquiries/{id} 의 data. */
export interface InquiryDetail extends InquiryListItem {
  content: string;
  /** 첨부파일 URL 목록. 서버가 단일 문자열에서 배열로 바꿨다. */
  attachments: string[];
  linkUrl: string | null;
  updatedAt: string;
  /** 답변이 없으면 null */
  answer: InquiryAnswer | null;
}

/** POST · PUT /admin/inquiries/{id}/answer 요청 본문. */
export interface AnswerRequest {
  content: string;
}

export interface InquiryListParams extends PageParams {
  /** 답변 여부 필터 (화면 편의용) */
  answered?: 'ALL' | 'OPEN' | 'ANSWERED';
}
