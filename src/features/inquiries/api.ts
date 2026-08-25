import { USE_MOCK, request } from '@/shared/api/client';
import { matchesKeyword, mockResponse, paginate } from '@/shared/api/mock';
import { MOCK_INQUIRIES } from '@/mocks/inquiries';
import type { Page } from '@/shared/lib/types';
import type {
  AnswerRequest,
  InquiryAnswer,
  InquiryDetail,
  InquiryListItem,
  InquiryListParams,
} from './types';

/**
 * 1:1 문의 API (명세 5.4).
 * 접근 권한은 SUPER_ADMIN · INQUIRY_ADMIN 이다 (GENERAL_ADMIN 은 403).
 *
 * NOTE: 명세에서 답변 수정/삭제만 경로가 `/api/admin/...` 으로 적혀 있는데,
 *       baseURL 이 이미 `/api` 라서 그대로 쓰면 `/api/api/admin/...` 이 된다.
 *       나머지 엔드포인트와 동일하게 `/admin/...` 으로 호출하고 백엔드에 확인 요청했다.
 */

export const inquiryKeys = {
  all: ['inquiries'] as const,
  list: (params: InquiryListParams) => ['inquiries', params] as const,
  detail: (id: number) => ['inquiry', id] as const,
};

/* 목 모드에서 답변 결과를 세션 동안 유지하기 위한 작업 사본. */
let inquiryStore: InquiryDetail[] = MOCK_INQUIRIES.map((i) => ({ ...i }));
let nextAnswerId = 600;

function toListItem(i: InquiryDetail): InquiryListItem {
  return {
    id: i.id,
    memberId: i.memberId,
    memberNickname: i.memberNickname,
    title: i.title,
    answered: i.answered,
    createdAt: i.createdAt,
  };
}

/**
 * GET /admin/inquiries — 전체 문의 목록
 *
 * TODO(api): 명세상 응답이 배열이라 페이징 정보가 없다. 화면에서는 목록이 길어지므로
 *            클라이언트에서 잘라 쓰고, 백엔드에 page/size 지원을 요청해 두었다.
 */
export async function fetchInquiries(params: InquiryListParams): Promise<Page<InquiryListItem>> {
  if (USE_MOCK) {
    const filtered = inquiryStore
      .filter((i) => {
        if (!params.answered || params.answered === 'ALL') return true;
        return params.answered === 'ANSWERED' ? i.answered : !i.answered;
      })
      .filter((i) => matchesKeyword(i, params.keyword, ['title', 'content', 'memberNickname']))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(toListItem);

    return mockResponse(paginate(filtered, params));
  }

  const list = await request<InquiryListItem[]>({ url: '/admin/inquiries', method: 'GET' });
  return paginate(list, params);
}

/** GET /admin/inquiries/{id} — 문의 상세 */
export async function fetchInquiry(id: number): Promise<InquiryDetail> {
  if (USE_MOCK) {
    const found = inquiryStore.find((i) => i.id === id);
    if (!found) throw new Error('존재하지 않는 문의입니다.');
    return mockResponse(found);
  }
  return request<InquiryDetail>({ url: `/admin/inquiries/${id}`, method: 'GET' });
}

/**
 * POST /admin/inquiries/{id}/answer — 답변 등록
 * 이미 답변이 있으면 서버가 409 CONFLICT 를 돌려준다.
 */
export async function createAnswer(id: number, body: AnswerRequest): Promise<InquiryAnswer> {
  if (USE_MOCK) {
    const index = inquiryStore.findIndex((i) => i.id === id);
    if (index < 0) throw new Error('존재하지 않는 문의입니다.');
    if (inquiryStore[index].answer) throw new Error('이미 답변이 등록된 문의입니다.');

    const now = new Date().toISOString();
    const answer: InquiryAnswer = {
      id: (nextAnswerId += 1),
      content: body.content,
      createdAt: now,
      updatedAt: now,
    };
    inquiryStore = inquiryStore.map((i, idx) =>
      idx === index ? { ...i, answer, answered: true, updatedAt: now } : i,
    );
    return mockResponse(answer, 600);
  }
  return request<InquiryAnswer>({ url: `/admin/inquiries/${id}/answer`, method: 'POST', data: body });
}

/** PUT /admin/inquiries/{id}/answer — 답변 수정 */
export async function updateAnswer(id: number, body: AnswerRequest): Promise<InquiryAnswer> {
  if (USE_MOCK) {
    const index = inquiryStore.findIndex((i) => i.id === id);
    if (index < 0 || !inquiryStore[index].answer) throw new Error('등록된 답변이 없습니다.');

    const now = new Date().toISOString();
    const answer: InquiryAnswer = {
      ...(inquiryStore[index].answer as InquiryAnswer),
      content: body.content,
      updatedAt: now,
    };
    inquiryStore = inquiryStore.map((i, idx) =>
      idx === index ? { ...i, answer, updatedAt: now } : i,
    );
    return mockResponse(answer, 600);
  }
  return request<InquiryAnswer>({ url: `/admin/inquiries/${id}/answer`, method: 'PUT', data: body });
}

/** DELETE /admin/inquiries/{id}/answer — 답변 삭제 */
export async function deleteAnswer(id: number): Promise<void> {
  if (USE_MOCK) {
    const index = inquiryStore.findIndex((i) => i.id === id);
    if (index < 0 || !inquiryStore[index].answer) throw new Error('등록된 답변이 없습니다.');

    inquiryStore = inquiryStore.map((i, idx) =>
      idx === index ? { ...i, answer: null, answered: false, updatedAt: new Date().toISOString() } : i,
    );
    return mockResponse(undefined, 500);
  }
  return request<void>({ url: `/admin/inquiries/${id}/answer`, method: 'DELETE' });
}

/** 목 데이터를 초기 상태로 되돌린다 (개발 편의용). */
export function resetInquiryStore(): void {
  inquiryStore = MOCK_INQUIRIES.map((i) => ({ ...i }));
}
