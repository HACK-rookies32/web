/**
 * 회원 관리 API (명세 5.2).
 *
 * 경로는 `/admin/members/customers/...` 다. 명세의 일부 헤딩이
 * `DELETE /admin/members/{id}` · `GET /admin/members/{id}/devices` 처럼 적혀
 * 있으나 각 절 본문의 Request 예시는 모두 `/customers` 를 포함한다.
 *
 * 타입은 명세 응답 필드명을 그대로 쓴다. `username` 이 실명이고 로그인 아이디는
 * `loginId` 라는 점만 주의하면 된다.
 */
import { USE_MOCK, request } from '@/shared/api/client';
import { matchesKeyword, mockResponse, paginate } from '@/shared/api/mock';
import { toCsv } from '@/shared/lib/format';
import { toPage, type SpringPage } from '@/shared/api/page';
import type { Page } from '@/shared/lib/types';
import { appendAuditLog } from '@/mocks/auditLogs';
import { MOCK_DEVICES, MOCK_MEMBERS, getMemberInquiries } from '@/mocks/members';
import { MOCK_WALLETS } from '@/mocks/payments';
import type { WalletSummary, WalletTransaction } from '@/shared/lib/wallet';
import type {
  Member,
  MemberDevice,
  MemberInquiry,
  MemberListParams,
  MemberUpdateRequest,
} from './types';

/** TanStack Query 키. */
export const memberKeys = {
  all: ['members'] as const,
  list: (params: MemberListParams) => ['members', params] as const,
  detail: (id: number) => ['member', id] as const,
  devices: (id: number) => ['member', id, 'devices'] as const,
  wallet: (id: number) => ['member', id, 'wallet'] as const,
  inquiries: (id: number) => ['member', id, 'inquiries'] as const,
};

/* 목 모드에서 수정·삭제 결과를 세션 동안 유지하기 위한 작업 사본. */
let memberStore: Member[] = [...MOCK_MEMBERS];

/**
 * GET /admin/members — 목록/검색
 *
 * 검색 대상은 명세 5.2 가 정한 `loginId`/`username`(실명)/`nickname` 이다.
 * 이메일·전화번호는 넣지 않는다. 화면에서 마스킹한 구간을 검색 결과의 참/거짓으로
 * 되짚을 수 있어(가운데 번호 4자리를 조회로 확인 가능) 마스킹이 무력해진다.
 */
export async function fetchMembers(params: MemberListParams): Promise<Page<Member>> {
  if (USE_MOCK) {
    /* 탈퇴 회원은 목록에 두지 않는다. 탈퇴는 되돌리지 않는 상태이고,
       섞어 두면 목록에서 활성 회원과 구분할 방법이 없다. */
    const filtered = memberStore
      .filter((m) => !m.isDeleted)
      .filter((m) => (params.role ? m.role === params.role : true))
      .filter((m) => matchesKeyword(m, params.keyword, ['loginId', 'username', 'nickname']));

    return mockResponse(paginate(filtered, params));
  }

  /* Spring Page 로 온다 — 현재 페이지가 page 가 아니라 number 다. */
  const data = await request<SpringPage<Member>>({
    url: '/admin/members/customers',
    method: 'GET',
    params,
  });
  return toPage(data);
}

/** GET /admin/members/{id} */
export async function fetchMember(memberId: number): Promise<Member> {
  if (USE_MOCK) {
    const found = memberStore.find((m) => m.id === memberId);
    if (!found) throw new Error('회원을 찾을 수 없습니다.');
    return mockResponse(found);
  }
  return request<Member>({ url: `/admin/members/customers/${memberId}`, method: 'GET' });
}

/** GET /admin/members/{id}/devices */
export async function fetchMemberDevices(memberId: number): Promise<MemberDevice[]> {
  if (USE_MOCK) return mockResponse(MOCK_DEVICES[memberId] ?? []);
  return request<MemberDevice[]>({ url: `/admin/members/customers/${memberId}/devices`, method: 'GET' });
}

/**
 * 회원 지갑 요약 (GET /admin/members/customers/{id}/subscription).
 *
 * 이름은 subscription 이지만 내용은 지갑 잔액 요약이다. 구독 모델이 폐기된 뒤
 * 서버가 기존 지갑 조회 로직을 이 경로에 그대로 위임하고 있다.
 * `/admin/wallets/{userId}` 는 명세 5.9 에서 삭제됐다(서버에서 500).
 *
 * ⚠️ 응답이 우리 WalletSummary 보다 좁다 — userName · role · relatedNames ·
 *    updatedAt 등이 오지 않는다. 자세한 차이는 payments/api.ts 의 fetchWallet 주석 참고.
 */
/** `GET /admin/members/customers/{id}/subscription` 응답. */
interface AdminUserWalletResponse {
  userId: number;
  balance: number;
  recentTransactions:
    | Array<{
        id: number;
        type: string;
        amount: number;
        balanceAfter: number;
        refUid: string | null;
        /* 취소·조정 사유. 서버가 원장에 memo 컬럼을 추가하며 신설됐다(2026-08-31). */
        memo: string | null;
        createdAt: string;
      }>
    | null;
}

/**
 * 회원 지갑 요약.
 *
 * 서버는 `{ userId, balance, recentTransactions }` 만 준다 — WalletSummary 가 쓰는
 * `relatedNames` · `updatedAt` · 원장의 `txId`/`refId` 가 없다. 매핑 없이 그대로
 * 넘기면 회원 상세 화면이 `relatedNames.map(...)` 에서 undefined 로 크래시한다.
 * 여기서 화면이 기대하는 모양으로 채워 준다(없는 값은 빈 값). 회원 이름·구분은
 * 상세 화면이 회원 데이터로 이미 갖고 있으므로 지갑에서는 비워 둔다.
 */
export async function fetchMemberWallet(memberId: number): Promise<WalletSummary | null> {
  if (USE_MOCK) return mockResponse(MOCK_WALLETS.find((w) => w.userId === memberId) ?? null);

  const data = await request<AdminUserWalletResponse>({
    url: `/admin/members/customers/${memberId}/subscription`,
    method: 'GET',
  });

  const recentTransactions = (
    Array.isArray(data?.recentTransactions) ? data.recentTransactions : []
  ).map<WalletTransaction>((t) => ({
    txId: t.id,
    type: t.type as WalletTransaction['type'],
    amount: t.amount,
    balanceAfter: t.balanceAfter,
    refId: t.refUid,
    memo: t.memo ?? null,
    createdAt: t.createdAt,
  }));

  return {
    walletId: 0,
    userId: data?.userId ?? memberId,
    userName: '',
    userEmail: '',
    role: 'PARENT',
    balance: data?.balance ?? 0,
    /* 지갑에 갱신 시각이 없어 가장 최근 원장의 시각을 쓴다. */
    updatedAt: recentTransactions[0]?.createdAt ?? '',
    relatedNames: [],
    recentTransactions,
  };
}

/**
 * 회원의 1:1 문의 기록.
 * TODO(api): 명세 5.4 의 GET /admin/inquiries 에 memberId 필터가 없다.
 *            지금은 목에서 회원별로 나눠 두었고, 연동 시 쿼리 파라미터가 필요하다.
 */
/** `GET /admin/inquiries` content 원소 (회원 상세에서 쓰는 부분). */
interface AdminInquiryListItem {
  id: number;
  title: string;
  answered: boolean;
  createdAt: string;
}

/**
 * 회원의 1:1 문의 기록.
 *
 * `GET /admin/inquiries?memberId=` 는 **페이지 객체**(`{ content, page, ... }`)를
 * 준다. 그대로 배열로 넘기면 문의 탭 목록이 배열이 아니라 크래시한다. content 를
 * 꺼내 화면이 쓰는 모양으로 옮긴다. 목록 응답에는 답변 시각이 없어 answeredAt 은
 * null 로 둔다(답변 여부만 표시).
 */
export async function fetchMemberInquiries(memberId: number): Promise<MemberInquiry[]> {
  if (USE_MOCK) return mockResponse(getMemberInquiries(memberId));

  const data = await request<Page<AdminInquiryListItem>>({
    url: '/admin/inquiries',
    method: 'GET',
    params: { memberId },
  });

  const content = Array.isArray(data?.content) ? data.content : [];
  return content.map<MemberInquiry>((i) => ({
    id: i.id,
    title: i.title,
    answered: i.answered,
    createdAt: i.createdAt,
    answeredAt: null,
  }));
}

/**
 * PATCH /admin/members/{id} — SUPER_ADMIN 전용
 *
 * 회원 정보 수정(MEMBER_UPDATE)으로 감사 로그가 남는다.
 * 서버 연동 후에는 서버가 기록하므로 목 블록만 남긴다.
 */
export async function updateMember(vars: {
  memberId: number;
  body: MemberUpdateRequest;
  adminUsername: string;
}): Promise<Member> {
  if (USE_MOCK) {
    const index = memberStore.findIndex((m) => m.id === vars.memberId);
    if (index < 0) throw new Error('회원을 찾을 수 없습니다.');

    const before = memberStore[index];
    const next = { ...before, ...vars.body, updatedAt: new Date().toISOString() };
    memberStore = memberStore.map((m, i) => (i === index ? next : m));

    appendAuditLog({
      adminLoginId: vars.adminUsername,
      activityType: 'MEMBER_UPDATE',
      activityLabel: '회원 정보 수정',
      targetType: 'MEMBER',
      targetId: vars.memberId,
    });

    return mockResponse(next);
  }
  return request<Member>({
    url: `/admin/members/customers/${vars.memberId}`,
    method: 'PATCH',
    data: vars.body,
  });
}

/** DELETE /admin/members/{id} — SUPER_ADMIN 전용 */
export async function deleteMember(vars: {
  memberId: number;
  adminUsername: string;
}): Promise<void> {
  if (USE_MOCK) {
    const target = memberStore.find((m) => m.id === vars.memberId);
    if (!target) throw new Error('회원을 찾을 수 없습니다.');

    memberStore = memberStore.filter((m) => m.id !== vars.memberId);
    appendAuditLog({
      adminLoginId: vars.adminUsername,
      activityType: 'MEMBER_DELETE',
      activityLabel: '회원 삭제',
      targetType: 'MEMBER',
      targetId: vars.memberId,
    });

    return mockResponse(undefined);
  }
  return request<void>({ url: `/admin/members/customers/${vars.memberId}`, method: 'DELETE' });
}

/**
 * 전체 회원 목록 CSV (명세 5.7 GET /members/customers/customers.csv).
 *
 * 개별 회원 리포트가 아니라 회원 목록 전체다. 컬럼은 명세의 12개를 따른다.
 * 목에서는 화면에 있는 데이터로 CSV 문자열을 만들어 돌려준다.
 *
 * CSV 는 원문을 담는다. 화면 표시용 마스킹과 달리 이 파일은 업무상 반출이
 * 목적이고, 내려받는 행위 자체가 REPORT_DOWNLOAD 로 감사 로그에 남는다.
 */
export async function fetchMembersCsv(vars: { adminUsername: string }): Promise<string> {
  if (USE_MOCK) {
    const csv = toCsv(
      [
        '회원ID', '로그인ID', '이름', '닉네임', '이메일', '전화번호',
        '주소', '권한', '부모ID', '탈퇴여부', '가입일', '수정일',
      ],
      memberStore.map((m) => [
        m.id,
        m.loginId,
        m.username,
        m.nickname,
        m.email ?? '',
        m.phoneNumber,
        m.address ?? '',
        m.role,
        m.parentId ?? '',
        m.isDeleted ? 'Y' : 'N',
        m.createdAt,
        m.updatedAt,
      ]),
    );

    appendAuditLog({
      adminLoginId: vars.adminUsername,
      activityType: 'REPORT_DOWNLOAD',
      activityLabel: '리포트 다운로드',
      targetType: 'MEMBER',
      targetId: 0,
    });

    return mockResponse(csv, 600);
  }

  return request<string>({ url: '/admin/members/customers/customers.csv', method: 'GET' });
}

