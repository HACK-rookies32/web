/**
 * 회원 관리 API (명세 5.2).
 *
 * 경로는 `/admin/members/customers/...` 다. 명세의 일부 헤딩이
 * `DELETE /admin/members/{id}` · `GET /admin/members/{id}/devices` 처럼 적혀
 * 있으나 각 절 본문의 Request 예시는 모두 `/customers` 를 포함한다.
 *
 * TODO(api): 응답 필드명이 우리 타입과 다르다. 연동 시 이 계층에서 매핑해야 한다.
 *   명세 id → memberId, loginId → username, username(실명) → name
 *   그리고 명세 응답에 없는 항목을 화면이 쓰고 있다 —
 *   lastLoginAt(최근 접속), deviceCount(등록 기기), children[](연결 자녀).
 *   회원 상태도 명세는 isDeleted(boolean) 뿐이라 정지 상태를 표현할 수 없다.
 *   백엔드 확인 대기.
 */
import { USE_MOCK, request } from '@/shared/api/client';
import { matchesKeyword, mockResponse, paginate } from '@/shared/api/mock';
import { toCsv } from '@/shared/lib/format';
import type { Page } from '@/shared/lib/types';
import { appendAuditLog } from '@/mocks/auditLogs';
import { MOCK_DEVICES, MOCK_MEMBERS, getMemberInquiries } from '@/mocks/members';
import { MOCK_WALLETS } from '@/mocks/payments';
import { MEMBER_STATUS } from '@/shared/lib/status';
import type { WalletSummary } from '@/shared/lib/wallet';
import type {
  MemberDetail,
  MemberDevice,
  MemberInquiry,
  MemberListItem,
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
let memberStore: MemberDetail[] = [...MOCK_MEMBERS];

/**
 * GET /admin/members — 목록/검색
 *
 * 검색 대상은 명세 5.2 가 정한 `loginId`/`username`(실명)/`nickname` 만이다.
 * 이메일·전화번호를 검색 대상에 넣으면, 화면에서 마스킹한 구간을 검색 결과의
 * 참/거짓으로 되짚을 수 있어(가운데 번호 4자리를 조회로 확인 가능) 마스킹이
 * 무력화된다. 목록 응답에 nickname 이 없어 지금은 실명·아이디만 대상으로 둔다.
 */
export async function fetchMembers(params: MemberListParams): Promise<Page<MemberListItem>> {
  if (USE_MOCK) {
    const filtered = memberStore
      .filter((m) => (params.status && params.status !== 'ALL' ? m.status === params.status : true))
      .filter((m) => matchesKeyword(m, params.keyword, ['name', 'username']));

    return mockResponse(paginate(filtered, params));
  }

  // TODO(api): 명세 5.2 의 쿼리에는 status 가 없다. 파라미터 추가 요청 중.
  return request<Page<MemberListItem>>({ url: '/admin/members/customers', method: 'GET', params });
}

/** GET /admin/members/{id} */
export async function fetchMember(memberId: number): Promise<MemberDetail> {
  if (USE_MOCK) {
    const found = memberStore.find((m) => m.memberId === memberId);
    if (!found) throw new Error('회원을 찾을 수 없습니다.');
    return mockResponse(found);
  }
  return request<MemberDetail>({ url: `/admin/members/customers/${memberId}`, method: 'GET' });
}

/** GET /admin/members/{id}/devices */
export async function fetchMemberDevices(memberId: number): Promise<MemberDevice[]> {
  if (USE_MOCK) return mockResponse(MOCK_DEVICES[memberId] ?? []);
  return request<MemberDevice[]>({ url: `/admin/members/customers/${memberId}/devices`, method: 'GET' });
}

/**
 * 회원 지갑 조회 (GET /admin/wallets/{userId}).
 *
 * 구독 모델이 폐기되면서 회원 상세의 결제 요약은 지갑 잔액으로 대체되었다.
 * 명세 5.2 에 GET /admin/members/{id}/subscription 이 아직 남아 있으나
 * 구독 개념 자체가 사라졌으므로 사용하지 않는다.
 */
export async function fetchMemberWallet(memberId: number): Promise<WalletSummary | null> {
  if (USE_MOCK) return mockResponse(MOCK_WALLETS.find((w) => w.userId === memberId) ?? null);
  return request<WalletSummary>({ url: `/admin/wallets/${memberId}`, method: 'GET' });
}

/**
 * 회원의 1:1 문의 기록.
 * TODO(api): 명세 5.4 의 GET /admin/inquiries 에 memberId 필터가 없다.
 *            지금은 목에서 회원별로 나눠 두었고, 연동 시 쿼리 파라미터가 필요하다.
 */
export async function fetchMemberInquiries(memberId: number): Promise<MemberInquiry[]> {
  if (USE_MOCK) return mockResponse(getMemberInquiries(memberId));
  return request<MemberInquiry[]>({
    url: '/admin/inquiries',
    method: 'GET',
    params: { memberId },
  });
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
}): Promise<MemberDetail> {
  if (USE_MOCK) {
    const index = memberStore.findIndex((m) => m.memberId === vars.memberId);
    if (index < 0) throw new Error('회원을 찾을 수 없습니다.');

    const before = memberStore[index];
    const next = { ...before, ...vars.body, updatedAt: new Date().toISOString() };
    memberStore = memberStore.map((m, i) => (i === index ? next : m));

    const statusChanged = vars.body.status !== undefined && vars.body.status !== before.status;
    appendAuditLog({
      adminUsername: vars.adminUsername,
      action: 'MEMBER_UPDATE',
      target: `member:${vars.memberId}`,
      description: statusChanged
        ? `${before.name} 회원 상태 ${MEMBER_STATUS[before.status].label} → ${MEMBER_STATUS[vars.body.status!].label}`
        : `${before.name} 회원 정보 수정 — ${describeChanges(before, vars.body)}`,
    });

    return mockResponse(next);
  }
  return request<MemberDetail>({
    url: `/admin/members/customers/${vars.memberId}`,
    method: 'PATCH',
    data: vars.body,
  });
}

/** 감사 로그 설명에 쓸 "무엇이 바뀌었는지". 값 자체는 개인정보라 항목명만 적는다. */
const MEMBER_FIELD_LABEL: Record<keyof MemberUpdateRequest, string> = {
  name: '이름',
  nickname: '닉네임',
  email: '이메일',
  phoneNumber: '휴대폰',
  address: '주소',
  status: '상태',
};

function describeChanges(before: MemberDetail, body: MemberUpdateRequest): string {
  const changed = (Object.keys(body) as (keyof MemberUpdateRequest)[]).filter(
    (key) => body[key] !== undefined && body[key] !== before[key],
  );
  return changed.length > 0 ? changed.map((key) => MEMBER_FIELD_LABEL[key]).join(', ') : '변경 없음';
}

/** DELETE /admin/members/{id} — SUPER_ADMIN 전용 */
export async function deleteMember(vars: {
  memberId: number;
  adminUsername: string;
}): Promise<void> {
  if (USE_MOCK) {
    const target = memberStore.find((m) => m.memberId === vars.memberId);
    if (!target) throw new Error('회원을 찾을 수 없습니다.');

    memberStore = memberStore.filter((m) => m.memberId !== vars.memberId);
    appendAuditLog({
      adminUsername: vars.adminUsername,
      action: 'MEMBER_DELETE',
      target: `member:${vars.memberId}`,
      description: `${target.name}(${target.username}) 회원 삭제`,
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
        m.memberId,
        m.username,
        m.name,
        m.nickname,
        m.email,
        m.phoneNumber,
        m.address,
        m.role,
        '',
        m.status === 'WITHDRAWN' ? 'Y' : 'N',
        m.createdAt,
        m.updatedAt,
      ]),
    );

    appendAuditLog({
      adminUsername: vars.adminUsername,
      action: 'REPORT_DOWNLOAD',
      target: 'report:members',
      description: `전체 회원 목록 CSV 내려받기 — ${memberStore.length}건`,
    });

    return mockResponse(csv, 600);
  }

  return request<string>({ url: '/admin/members/customers/customers.csv', method: 'GET' });
}

