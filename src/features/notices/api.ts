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

/* ----------------------------------------------------------- 첨부 업로드 ---- */

/** POST /files/notice/presign 응답. */
interface PresignResponse {
  /** 브라우저가 파일 본문을 PUT 할 S3 서명 URL (서로 다른 출처, 인증 헤더 금지). */
  uploadUrl: string;
  /** 업로드 후 이 파일을 가리킬 공개 경로. 공지 attachments 에 넣을 값. */
  url: string;
  filename: string;
  contentType: string;
}

/**
 * 공지 첨부파일 하나를 업로드하고 **공개 경로**를 돌려준다.
 *
 * 서버는 공지 저장 시 attachments 의 각 경로가 실제로 올라온 파일인지 검증한다
 * (AttachmentValidator). 그래서 파일명만 넘기면 400 이 난다 — 반드시 아래 흐름으로
 * 실제 업로드한 뒤 받은 공개 경로를 넣어야 한다.
 *
 *   1) POST /files/notice/presign  { filename, contentType }  → { uploadUrl, url }
 *   2) PUT  {uploadUrl}  (파일 본문, Content-Type 은 presign 과 동일)  ← S3 직접
 *   3) presign 의 url(공개 경로)을 attachments 에 넣어 공지 저장
 *
 * PUT 은 다른 출처(S3)로 나가므로 앱의 axios(request) 를 타지 않는다 — 인증 헤더가
 * 붙으면 서명과 충돌한다. raw fetch 로 보낸다.
 *
 * 저장소가 로컬 디스크 모드면 presign 이 409 를 준다(운영은 S3 전제). 그 경우는
 * 호출부에서 안내 토스트를 띄운다.
 */
export async function uploadNoticeAttachment(file: File): Promise<string> {
  const contentType = file.type || 'application/octet-stream';

  if (USE_MOCK) {
    // 목 모드는 서버가 없다. 실제 서버 경로와 같은 모양의 공개 경로를 만들어 준다.
    const stamp = Date.now().toString(36);
    return mockResponse(`/api/files/notice/${stamp}_${file.name}`, 400);
  }

  const presigned = await request<PresignResponse>({
    url: '/files/notice/presign',
    method: 'POST',
    data: { filename: file.name, contentType },
  });

  const put = await fetch(presigned.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });
  if (!put.ok) {
    throw new Error(`업로드에 실패했습니다 (${put.status})`);
  }

  return presigned.url;
}

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
 * 되돌릴 수 없으므로 호출 전 확인 절차를 반드시 거친다. 서버는 발송까지 마친 뒤 200 을 준다.
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

