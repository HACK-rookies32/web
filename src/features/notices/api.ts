import { USE_MOCK, request } from '@/shared/api/client';
import { mockResponse, paginate } from '@/shared/api/mock';
import { DEFAULT_PAGE_SIZE } from '@/shared/lib/constants';
import { appendAuditLog } from '@/mocks/auditLogs';
import { MOCK_NOTICES } from '@/mocks/notices';
import type { Page } from '@/shared/lib/types';
import type {
  BroadcastRequest,
  NoticeDetail,
  NoticeListItem,
  NoticeListParams,
  NoticeRequest,
} from './types';

/**
 * 공지 / 알림 API (명세 5.3).
 * 목록·상세는 인증만 필요하고, 작성·수정·삭제·전체 알림은 SUPER_ADMIN 전용이다.
 */

export const noticeKeys = {
  all: ['notices'] as const,
  list: (params: NoticeListParams) => ['notices', params] as const,
  detail: (id: number) => ['notice', id] as const,
};

/* 목 모드에서 CRUD 결과를 세션 동안 유지하기 위한 작업 사본. */
let noticeStore: NoticeDetail[] = [...MOCK_NOTICES];
let nextNoticeId = 9100;

function toListItem(n: NoticeDetail): NoticeListItem {
  const { content: _content, attachments: _a, links: _l, ...rest } = n;
  return rest;
}

/** GET /admin/notices */
export async function fetchNotices(params: NoticeListParams): Promise<Page<NoticeListItem>> {
  if (USE_MOCK) {
    const filtered = noticeStore
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(toListItem);

    return mockResponse(paginate(filtered, params));
  }
  /*
   * 평평한 페이지 객체로 온다. 이전에는 Spring Page(현재 페이지가 number)였는데
   * 서버가 평평한 형태로 바꿨다 — `number` 를 계속 읽으면 항상 1페이지로 보인다.
   */
  const data = await request<Page<NoticeListItem>>({
    url: '/admin/notices',
    method: 'GET',
    params: {
      keyword: params.keyword || undefined,
      page: params.page ?? 0,
      size: params.size ?? DEFAULT_PAGE_SIZE,
    },
  });

  return {
    content: Array.isArray(data?.content) ? data.content : [],
    page: data?.page ?? 0,
    size: data?.size ?? 0,
    totalElements: data?.totalElements ?? 0,
    totalPages: data?.totalPages ?? 0,
  };
}

/** GET /admin/notices/{id} */
export async function fetchNotice(id: number): Promise<NoticeDetail> {
  if (USE_MOCK) {
    const found = noticeStore.find((n) => n.id === id);
    if (!found) throw new Error('존재하지 않는 공지입니다.');
    return mockResponse(found);
  }
  return request<NoticeDetail>({ url: `/admin/notices/${id}`, method: 'GET' });
}

/** POST /admin/notices — SUPER_ADMIN */
export async function createNotice(vars: {
  body: NoticeRequest;
  adminUsername: string;
}): Promise<NoticeDetail> {
  if (USE_MOCK) {
    const now = new Date().toISOString();
    const created: NoticeDetail = {
      id: (nextNoticeId += 1),
      title: vars.body.title,
      content: vars.body.content,
      attachments: vars.body.attachments ?? [],
      links: vars.body.links ?? [],
      authorName: vars.adminUsername,
      attachmentCount: (vars.body.attachments ?? []).length,
      linkCount: (vars.body.links ?? []).length,
      createdAt: now,
      updatedAt: now,
    };
    noticeStore = [created, ...noticeStore];

    appendAuditLog({
      adminLoginId: vars.adminUsername,
      activityType: 'NOTICE_CREATE',
      activityLabel: '공지사항 등록',
      targetType: 'NOTICE',
      targetId: created.id,
    });

    return mockResponse(created, 500);
  }
  return request<NoticeDetail>({ url: '/admin/notices', method: 'POST', data: vars.body });
}

/** PATCH /admin/notices/{id} — SUPER_ADMIN */
export async function updateNotice(vars: {
  id: number;
  body: NoticeRequest;
  adminUsername: string;
}): Promise<NoticeDetail> {
  if (USE_MOCK) {
    const index = noticeStore.findIndex((n) => n.id === vars.id);
    if (index < 0) throw new Error('존재하지 않는 공지입니다.');

    const next: NoticeDetail = {
      ...noticeStore[index],
      ...vars.body,
      attachments: vars.body.attachments ?? noticeStore[index].attachments,
      links: vars.body.links ?? noticeStore[index].links,
      attachmentCount: (vars.body.attachments ?? noticeStore[index].attachments).length,
      linkCount: (vars.body.links ?? noticeStore[index].links).length,
      updatedAt: new Date().toISOString(),
    };
    noticeStore = noticeStore.map((n, i) => (i === index ? next : n));

    appendAuditLog({
      adminLoginId: vars.adminUsername,
      activityType: 'NOTICE_UPDATE',
      activityLabel: '공지사항 수정',
      targetType: 'NOTICE',
      targetId: vars.id,
    });

    return mockResponse(next, 500);
  }
  return request<NoticeDetail>({
    url: `/admin/notices/${vars.id}`,
    method: 'PATCH',
    data: vars.body,
  });
}

/** DELETE /admin/notices/{id} — SUPER_ADMIN */
export async function deleteNotice(vars: {
  id: number;
  title: string;
  adminUsername: string;
}): Promise<void> {
  if (USE_MOCK) {
    noticeStore = noticeStore.filter((n) => n.id !== vars.id);
    appendAuditLog({
      adminLoginId: vars.adminUsername,
      activityType: 'NOTICE_DELETE',
      activityLabel: '공지사항 삭제',
      targetType: 'NOTICE',
      targetId: vars.id,
    });
    return mockResponse(undefined);
  }
  return request<void>({ url: `/admin/notices/${vars.id}`, method: 'DELETE' });
}

/**
 * POST /admin/notifications/broadcast — 전체 알림 발송 (SUPER_ADMIN)
 * 되돌릴 수 없으므로 호출 전 확인 절차를 반드시 거친다. 응답은 202(비동기 접수).
 */
export async function broadcastNotification(vars: {
  body: BroadcastRequest;
  adminUsername: string;
}): Promise<void> {
  if (USE_MOCK) {
    /* 알림 발송은 공지 작성과 다른 활동이다(명세 5.8 NOTIFICATION_BROADCAST). */
    appendAuditLog({
      adminLoginId: vars.adminUsername,
      activityType: 'NOTIFICATION_BROADCAST',
      activityLabel: '전체 알림 발송',
      targetType: 'NOTIFICATION',
      targetId: 0,
    });
    return mockResponse(undefined, 800);
  }
  return request<void>({
    url: '/admin/notifications/broadcast',
    method: 'POST',
    data: vars.body,
  });
}

