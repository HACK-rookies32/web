import { USE_MOCK, request } from '@/shared/api/client';
import { matchesKeyword, mockResponse, paginate } from '@/shared/api/mock';
import { toCsv } from '@/shared/lib/format';
import type { Page } from '@/shared/lib/types';
import {
  MOCK_DEVICES,
  MOCK_MEMBERS,
  MOCK_MEMBER_INQUIRIES,
  MOCK_SUBSCRIPTIONS,
} from '@/mocks/members';
import type {
  MemberDetail,
  MemberDevice,
  MemberInquiry,
  MemberListItem,
  MemberListParams,
  MemberSubscription,
  MemberUpdateRequest,
} from './types';

/** TanStack Query 키. */
export const memberKeys = {
  all: ['members'] as const,
  list: (params: MemberListParams) => ['members', params] as const,
  detail: (id: number) => ['member', id] as const,
  devices: (id: number) => ['member', id, 'devices'] as const,
  subscription: (id: number) => ['member', id, 'subscription'] as const,
  inquiries: (id: number) => ['member', id, 'inquiries'] as const,
};

/* 목 모드에서 수정·삭제 결과를 세션 동안 유지하기 위한 작업 사본. */
let memberStore: MemberDetail[] = [...MOCK_MEMBERS];

/** GET /admin/members — 목록/검색 */
export async function fetchMembers(params: MemberListParams): Promise<Page<MemberListItem>> {
  if (USE_MOCK) {
    const filtered = memberStore
      .filter((m) => (params.status && params.status !== 'ALL' ? m.status === params.status : true))
      .filter((m) => matchesKeyword(m, params.keyword, ['name', 'email', 'username', 'phoneNumber']));

    return mockResponse(paginate(filtered, params));
  }

  // TODO(api): 명세 5.2 의 쿼리에는 status 가 없다. 파라미터 추가 요청 중.
  return request<Page<MemberListItem>>({ url: '/admin/members', method: 'GET', params });
}

/** GET /admin/members/{id} */
export async function fetchMember(memberId: number): Promise<MemberDetail> {
  if (USE_MOCK) {
    const found = memberStore.find((m) => m.memberId === memberId);
    if (!found) throw new Error('회원을 찾을 수 없습니다.');
    return mockResponse(found);
  }
  return request<MemberDetail>({ url: `/admin/members/${memberId}`, method: 'GET' });
}

/** GET /admin/members/{id}/devices */
export async function fetchMemberDevices(memberId: number): Promise<MemberDevice[]> {
  if (USE_MOCK) return mockResponse(MOCK_DEVICES[memberId] ?? []);
  return request<MemberDevice[]>({ url: `/admin/members/${memberId}/devices`, method: 'GET' });
}

/** GET /admin/members/{id}/subscription */
export async function fetchMemberSubscription(memberId: number): Promise<MemberSubscription | null> {
  if (USE_MOCK) return mockResponse(MOCK_SUBSCRIPTIONS[memberId] ?? null);
  return request<MemberSubscription>({ url: `/admin/members/${memberId}/subscription`, method: 'GET' });
}

/**
 * 회원의 1:1 문의 기록.
 * TODO(api): 명세 5.4 의 GET /admin/inquiries 에 memberId 필터가 없다.
 *            지금은 목에서 회원별로 나눠 두었고, 연동 시 쿼리 파라미터가 필요하다.
 */
export async function fetchMemberInquiries(memberId: number): Promise<MemberInquiry[]> {
  if (USE_MOCK) return mockResponse(MOCK_MEMBER_INQUIRIES[memberId] ?? []);
  return request<MemberInquiry[]>({
    url: '/admin/inquiries',
    method: 'GET',
    params: { memberId },
  });
}

/** PATCH /admin/members/{id} — SUPER_ADMIN 전용 */
export async function updateMember(
  memberId: number,
  body: MemberUpdateRequest,
): Promise<MemberDetail> {
  if (USE_MOCK) {
    const index = memberStore.findIndex((m) => m.memberId === memberId);
    if (index < 0) throw new Error('회원을 찾을 수 없습니다.');

    const next = { ...memberStore[index], ...body, updatedAt: new Date().toISOString() };
    memberStore = memberStore.map((m, i) => (i === index ? next : m));
    return mockResponse(next);
  }
  return request<MemberDetail>({ url: `/admin/members/${memberId}`, method: 'PATCH', data: body });
}

/** DELETE /admin/members/{id} — SUPER_ADMIN 전용 */
export async function deleteMember(memberId: number): Promise<void> {
  if (USE_MOCK) {
    memberStore = memberStore.filter((m) => m.memberId !== memberId);
    return mockResponse(undefined);
  }
  return request<void>({ url: `/admin/members/${memberId}`, method: 'DELETE' });
}

/**
 * 회원 리포트 CSV.
 * 실제: GET /admin/reports/members.csv (명세 5.7) → text/csv 다운로드
 * 목: 화면에 있는 데이터로 CSV 문자열을 만들어 돌려준다.
 */
export async function fetchMemberReportCsv(member: MemberDetail): Promise<string> {
  if (USE_MOCK) {
    const devices = MOCK_DEVICES[member.memberId] ?? [];
    const inquiries = MOCK_MEMBER_INQUIRIES[member.memberId] ?? [];
    const subscription = MOCK_SUBSCRIPTIONS[member.memberId];

    const csv = toCsv(
      ['항목', '값'],
      [
        ['회원 ID', member.memberId],
        ['아이디', member.username],
        ['이름', member.name],
        ['이메일', member.email],
        ['휴대폰', member.phoneNumber],
        ['상태', member.status],
        ['가입일', member.createdAt],
        ['연결 자녀 수', member.children.length],
        ['등록 기기 수', devices.length],
        ['구독 상태', subscription?.status ?? '-'],
        ['구독 플랜', subscription?.planName ?? '-'],
        ['다음 결제일', subscription?.nextBillingDate ?? '-'],
        ['문의 건수', inquiries.length],
        ['미답변 문의', inquiries.filter((i) => i.status === 'OPEN').length],
      ],
    );

    // 실제 리포트 생성처럼 보이도록 조금 더 기다린다.
    return mockResponse(csv, 900);
  }

  return request<string>({
    url: '/admin/reports/members.csv',
    method: 'GET',
    params: { memberId: member.memberId },
    responseType: 'text',
  });
}

/** 목 데이터를 초기 상태로 되돌린다 (개발 편의용). */
export function resetMemberStore(): void {
  memberStore = [...MOCK_MEMBERS];
}
