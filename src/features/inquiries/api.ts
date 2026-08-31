import { USE_MOCK, request } from '@/shared/api/client';
import { mockResponse, paginate } from '@/shared/api/mock';
import { DEFAULT_PAGE_SIZE } from '@/shared/lib/constants';
import { MOCK_INQUIRIES } from '@/mocks/inquiries';
import { appendAuditLog } from '@/mocks/auditLogs';
import { toCsv } from '@/shared/lib/format';
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
 * GET /admin/inquiries?page&size — 전체 문의 목록
 *
 * 서버는 평평한 페이지 객체 `{ content, page, size, totalElements, totalPages }` 를
 * 돌려준다. 공지·커뮤니티의 Spring Page 와 달리 현재 페이지가 `page` 라 그대로 쓴다.
 *
 * 예전 명세에는 응답이 배열로 적혀 있어 받아서 클라이언트에서 잘라 썼는데,
 * 실서버는 페이지 객체를 준다. 배열로 알고 slice 를 부르면 터진다 —
 * 실제로 홈 화면의 문의 칸이 이 때문에 "불러오지 못했습니다" 로 떴다.
 *
 * `answered` 필터는 서버 쿼리에 없어 받아온 페이지 안에서만 거른다.
 */
export async function fetchInquiries(params: InquiryListParams): Promise<Page<InquiryListItem>> {
  if (USE_MOCK) {
    const filtered = inquiryStore
      .filter((i) => {
        if (!params.answered || params.answered === 'ALL') return true;
        return params.answered === 'ANSWERED' ? i.answered : !i.answered;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(toListItem);

    return mockResponse(paginate(filtered, params));
  }

  const answeredActive = Boolean(params.answered && params.answered !== 'ALL');
  const page = params.page ?? 0;
  const size = params.size ?? DEFAULT_PAGE_SIZE;

  /*
   * 서버 `GET /admin/inquiries` 에는 답변 여부 필터가 없다.
   *
   * 예전에는 서버가 준 **그 페이지 안에서만** 걸러 놓고 건수·페이지 수는 서버 값
   * (필터 전)을 그대로 썼다. 그래서 "전체 87건 · 9페이지" 라고 적혀 있는데 각
   * 페이지에는 0~10건이 들쭉날쭉 나오고, 대기 문의가 없는 페이지는 통째로 비었다.
   *
   * 필터가 걸린 동안에는 넉넉히 받아 와서 **웹이 직접 걸러 페이지를 나눈다.**
   * 그래야 표시 건수와 페이지 수가 실제 결과와 맞는다.
   */
  const data = await request<Page<InquiryListItem>>({
    url: '/admin/inquiries',
    method: 'GET',
    params: answeredActive ? { page: 0, size: 200 } : { page, size },
  });

  const content = Array.isArray(data?.content) ? data.content : [];

  if (!answeredActive) {
    return {
      content,
      page: data?.page ?? 0,
      size: data?.size ?? 0,
      totalElements: data?.totalElements ?? 0,
      totalPages: data?.totalPages ?? 0,
    };
  }

  const filtered = content.filter((i) =>
    params.answered === 'ANSWERED' ? i.answered : !i.answered,
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / size));
  const safePage = Math.min(page, totalPages - 1);

  return {
    content: filtered.slice(safePage * size, safePage * size + size),
    page: safePage,
    size,
    totalElements: filtered.length,
    totalPages,
  };
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


/**
 * GET /admin/inquiries/inquiries.csv — 1:1 문의 내역 CSV (명세 5.7)
 *
 * 목에서는 화면에 있는 데이터로 CSV 문자열을 만들어 돌려준다.
 * 내려받는 행위 자체가 REPORT_DOWNLOAD 로 감사 로그에 남는다.
 */
export async function fetchInquiriesCsv(vars: { adminUsername: string }): Promise<string> {
  if (USE_MOCK) {
    const csv = toCsv(
      [
        '문의ID', '작성자ID', '작성자닉네임', '제목', '내용', '첨부파일URL',
        '링크URL', '답변여부', '작성일', '수정일', '답변내용', '답변일',
      ],
      inquiryStore.map((i) => [
        i.id,
        i.memberId,
        i.memberNickname,
        i.title,
        i.content,
        (i.attachments ?? []).join(' '),
        i.linkUrl ?? '',
        i.answered ? 'Y' : 'N',
        i.createdAt,
        i.updatedAt,
        i.answer?.content ?? '',
        i.answer?.createdAt ?? '',
      ]),
    );

    appendAuditLog({
      adminLoginId: vars.adminUsername,
      activityType: 'REPORT_DOWNLOAD',
      activityLabel: '리포트 다운로드',
      targetType: 'INQUIRY_ANSWER',
      targetId: 0,
    });

    return mockResponse(csv, 600);
  }
  return request<string>({ url: '/admin/inquiries/inquiries.csv', method: 'GET' });
}
