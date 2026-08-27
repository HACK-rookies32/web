import { USE_MOCK, request } from '@/shared/api/client';
import { matchesKeyword, mockResponse, paginate } from '@/shared/api/mock';
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
      .filter((n) => matchesKeyword(n, params.keyword, ['title', 'content', 'authorName']))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(toListItem);

    return mockResponse(paginate(filtered, params));
  }
  return request<Page<NoticeListItem>>({ url: '/admin/notices', method: 'GET', params });
}

/** GET /admin/notices/{id} */
export async function fetchNotice(noticeId: number): Promise<NoticeDetail> {
  if (USE_MOCK) {
    const found = noticeStore.find((n) => n.noticeId === noticeId);
    if (!found) throw new Error('존재하지 않는 공지입니다.');
    return mockResponse(found);
  }
  return request<NoticeDetail>({ url: `/admin/notices/${noticeId}`, method: 'GET' });
}

/** POST /admin/notices — SUPER_ADMIN */
export async function createNotice(vars: {
  body: NoticeRequest;
  adminUsername: string;
}): Promise<NoticeDetail> {
  if (USE_MOCK) {
    const now = new Date().toISOString();
    const created: NoticeDetail = {
      noticeId: (nextNoticeId += 1),
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
      adminUsername: vars.adminUsername,
      action: 'NOTICE_CREATE',
      target: `notice:${created.noticeId}`,
      description: `공지 작성 — ${created.title}`,
    });

    return mockResponse(created, 500);
  }
  return request<NoticeDetail>({ url: '/admin/notices', method: 'POST', data: vars.body });
}

/** PATCH /admin/notices/{id} — SUPER_ADMIN */
export async function updateNotice(vars: {
  noticeId: number;
  body: NoticeRequest;
  adminUsername: string;
}): Promise<NoticeDetail> {
  if (USE_MOCK) {
    const index = noticeStore.findIndex((n) => n.noticeId === vars.noticeId);
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
      adminUsername: vars.adminUsername,
      action: 'NOTICE_UPDATE',
      target: `notice:${vars.noticeId}`,
      description: `공지 수정 — ${next.title}`,
    });

    return mockResponse(next, 500);
  }
  return request<NoticeDetail>({
    url: `/admin/notices/${vars.noticeId}`,
    method: 'PATCH',
    data: vars.body,
  });
}

/** DELETE /admin/notices/{id} — SUPER_ADMIN */
export async function deleteNotice(vars: {
  noticeId: number;
  title: string;
  adminUsername: string;
}): Promise<void> {
  if (USE_MOCK) {
    noticeStore = noticeStore.filter((n) => n.noticeId !== vars.noticeId);
    appendAuditLog({
      adminUsername: vars.adminUsername,
      action: 'NOTICE_DELETE',
      target: `notice:${vars.noticeId}`,
      description: `공지 삭제 — ${vars.title}`,
    });
    return mockResponse(undefined);
  }
  return request<void>({ url: `/admin/notices/${vars.noticeId}`, method: 'DELETE' });
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
    appendAuditLog({
      adminUsername: vars.adminUsername,
      action: 'NOTICE_CREATE',
      target: `broadcast:${vars.body.type}`,
      description: `전체 알림 발송 — ${vars.body.title}`,
    });
    return mockResponse(undefined, 800);
  }
  return request<void>({
    url: '/admin/notifications/broadcast',
    method: 'POST',
    data: vars.body,
  });
}

