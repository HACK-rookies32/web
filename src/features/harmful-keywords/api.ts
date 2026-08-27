import { USE_MOCK, request } from '@/shared/api/client';
import { mockResponse } from '@/shared/api/mock';
import { appendAuditLog } from '@/mocks/auditLogs';
import { MOCK_HARMFUL_KEYWORDS } from '@/mocks/harmfulKeywords';
import type { HarmfulKeyword, HarmfulKeywordCreateRequest } from './types';

export const harmfulKeywordKeys = {
  all: ['harmful-keywords'] as const,
};

let keywordStore: HarmfulKeyword[] = [...MOCK_HARMFUL_KEYWORDS];
let nextKeywordId = 400;

/** GET /admin/harmful-keywords — SUPER_ADMIN */
export async function fetchHarmfulKeywords(): Promise<HarmfulKeyword[]> {
  if (USE_MOCK) {
    return mockResponse(
      [...keywordStore].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    );
  }

  return request<HarmfulKeyword[]>({ url: '/admin/harmful-keywords', method: 'GET' });
}

/** POST /admin/harmful-keywords — SUPER_ADMIN */
export async function createHarmfulKeyword(vars: {
  body: HarmfulKeywordCreateRequest;
  adminUsername: string;
}): Promise<HarmfulKeyword> {
  const { body } = vars;
  if (USE_MOCK) {
    const normalized = body.keyword.trim();
    const duplicated = keywordStore.some(
      (item) => item.keyword.toLocaleLowerCase() === normalized.toLocaleLowerCase(),
    );
    if (duplicated) throw new Error('이미 등록된 차단 키워드입니다.');

    const created: HarmfulKeyword = {
      id: (nextKeywordId += 1),
      keyword: normalized,
      createdAt: new Date().toISOString(),
    };
    keywordStore = [created, ...keywordStore];

    appendAuditLog({
      adminUsername: vars.adminUsername,
      action: 'KEYWORD_CREATE',
      target: `keyword:${created.id}`,
      description: `차단 키워드 추가 — ${created.keyword}`,
    });

    return mockResponse(created, 450);
  }

  return request<HarmfulKeyword>({
    url: '/admin/harmful-keywords',
    method: 'POST',
    data: body,
  });
}

/** DELETE /admin/harmful-keywords/{id} — SUPER_ADMIN */
export async function deleteHarmfulKeyword(vars: {
  id: number;
  adminUsername: string;
}): Promise<void> {
  if (USE_MOCK) {
    const target = keywordStore.find((item) => item.id === vars.id);
    keywordStore = keywordStore.filter((item) => item.id !== vars.id);

    appendAuditLog({
      adminUsername: vars.adminUsername,
      action: 'KEYWORD_DELETE',
      target: `keyword:${vars.id}`,
      description: `차단 키워드 제외 — ${target?.keyword ?? vars.id}`,
    });

    return mockResponse(undefined, 400);
  }

  return request<void>({ url: `/admin/harmful-keywords/${vars.id}`, method: 'DELETE' });
}
