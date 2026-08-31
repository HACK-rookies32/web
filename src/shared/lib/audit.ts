/**
 * 감사 로그 규격 (명세 5.8 / 서버 AuditLogResponse).
 *
 * 필드명은 서버 응답을 그대로 쓴다. 실서버로 확인한 한 건은 이렇다.
 *
 *   { id, adminId, adminLoginId, activityType, activityLabel,
 *     targetType, targetId, occurredAt }
 *
 * 표시 문구(`activityLabel`)를 서버가 확정해 내려주므로 화면은 그 값을 쓴다.
 * 아래 라벨 표는 **필터 드롭다운을 그리기 위한 것**이다 — 목록을 받기 전에는
 * 서버 라벨을 알 수 없기 때문이다.
 */

/**
 * 활동 유형.
 *
 * 서버 `AdminActivityType` 을 기준으로 맞춘다(코드 대조 2026-08-31).
 *
 * `ADMIN_LOGIN` · `ADMIN_LOGOUT` 은 명세 5.8 표에 없지만 로그인·로그아웃마다 실제로
 * 쌓인다. `MEMBER_BAN` 은 "밴 API 가 없어졌다" 고 적어 두었던 것이 사실과 달랐다 —
 * 서버에 `POST /admin/community/members/ban` 과 enum 이 모두 살아 있어, 다른 경로로
 * 밴이 일어나면 이 유형이 쌓인다. 웹에 없으면 필터로 걸러볼 수 없어 추가한다.
 *
 * `REPORT_DOWNLOAD` 는 **서버 enum 에 없다**(CSV 다운로드를 서버가 기록하지 않는다).
 * 목 모드에서만 쓰이며, 서버로 나가면 INVALID_ACTIVITY_TYPE 이라 필터에서 숨긴다.
 */
export type AuditActivityType =
  | 'ADMIN_LOGIN'
  | 'ADMIN_LOGOUT'
  | 'MEMBER_UPDATE'
  | 'MEMBER_DELETE'
  | 'MEMBER_ROLE_UPDATE'
  | 'MEMBER_BAN'
  | 'WALLET_BALANCE_ADJUST'
  | 'CHARGE_CANCEL'
  | 'PAYMENT_REFUND'
  | 'POST_DELETE'
  | 'HARMFUL_KEYWORD_ADD'
  | 'HARMFUL_KEYWORD_DELETE'
  | 'NOTICE_CREATE'
  | 'NOTICE_UPDATE'
  | 'NOTICE_DELETE'
  | 'INQUIRY_ANSWER_CREATE'
  | 'INQUIRY_ANSWER_UPDATE'
  | 'INQUIRY_ANSWER_DELETE'
  | 'NOTIFICATION_BROADCAST'
  | 'REPORT_DOWNLOAD';

/**
 * 필터 드롭다운용 표시 문구.
 *
 * 서버가 `activityLabel` 을 주므로 목록 행은 그 값을 그대로 쓴다.
 * 이 표는 아직 데이터를 받기 전인 드롭다운을 채울 때만 쓰고, 서버가 모르는
 * 유형을 만나면 코드값을 그대로 보여준다.
 */
export const AUDIT_ACTIVITY_LABEL: Record<AuditActivityType, string> = {
  ADMIN_LOGIN: '관리자 로그인',
  ADMIN_LOGOUT: '관리자 로그아웃',
  MEMBER_UPDATE: '회원 정보 수정',
  MEMBER_DELETE: '회원 삭제',
  MEMBER_ROLE_UPDATE: '관리자 권한 변경',
  MEMBER_BAN: '계정 정지',
  WALLET_BALANCE_ADJUST: '지갑 잔액 수동 조정',
  CHARGE_CANCEL: '충전 취소',
  PAYMENT_REFUND: '강제 환불',
  POST_DELETE: '게시글 삭제',
  HARMFUL_KEYWORD_ADD: '차단 키워드 추가',
  HARMFUL_KEYWORD_DELETE: '차단 키워드 제외',
  NOTICE_CREATE: '공지사항 등록',
  NOTICE_UPDATE: '공지사항 수정',
  NOTICE_DELETE: '공지사항 삭제',
  INQUIRY_ANSWER_CREATE: '문의 답변 등록',
  INQUIRY_ANSWER_UPDATE: '문의 답변 수정',
  INQUIRY_ANSWER_DELETE: '문의 답변 삭제',
  NOTIFICATION_BROADCAST: '전체 알림 발송',
  REPORT_DOWNLOAD: '리포트 다운로드',
};

/**
 * 필터 드롭다운에 노출할 값.
 *
 * 두 가지를 뺀다.
 *
 *   REPORT_DOWNLOAD — 명세 5.8 표에 없어 서버가 이 값으로 필터링해 주지 않는다.
 *                     CSV 다운로드도 감사 대상이므로 표에 추가를 요청해 둔 상태다.
 *   PAYMENT_REFUND  — 대응하는 강제 환불 기능을 웹에서 걷어냈다. 서버는 과거 이력을
 *                     읽기 위해 코드와 enum 을 남겨 두었으므로(백엔드 회신 2026-08-29)
 *                     **라벨 표는 유지하되 필터에는 노출하지 않는다.** 지난 기록에
 *                     이 유형이 섞여 있으면 목록 행에는 그대로 "강제 환불" 로 보인다.
 */
const HIDDEN_FILTER_ACTIVITIES: AuditActivityType[] = ['REPORT_DOWNLOAD', 'PAYMENT_REFUND'];

export const AUDIT_FILTER_ACTIVITIES = (
  Object.keys(AUDIT_ACTIVITY_LABEL) as AuditActivityType[]
).filter((type) => !HIDDEN_FILTER_ACTIVITIES.includes(type));

/**
 * 감사 로그 목록 쿼리 키.
 *
 * 감사 대상 활동은 회원·자금·공지·커뮤니티 등 여러 feature 에서 일어나는데,
 * feature 끼리는 서로 import 하지 않는 것이 이 프로젝트의 규칙이다.
 * 그래서 키만 shared 로 올려 두고, 각 feature 는 `useAuditLogSync()` 로 무효화한다.
 */
export const AUDIT_LOG_QUERY_KEY = ['audit-logs'] as const;

/* ------------------------------------------------------------- 대상 ---- */

/*
 * 대상 리소스 종류 (서버 `targetType`, 명세 5.8).
 *
 * 표에 `MEMBER 21` 처럼 코드값을 그대로 찍으면 관리자가 무엇을 가리키는지 알 수
 * 없다. 종류를 우리말로 풀고, 이어지는 화면이 있으면 링크를 건다.
 * 서버가 모르는 종류를 보내도 화면이 깨지지 않도록 Record<string, …> 로 둔다.
 */
const TARGET_KINDS: Record<string, { label: string; href: (id: number) => string | null }> = {
  MEMBER: { label: '회원', href: (id) => `/members/${id}` },
  WALLET: { label: '지갑', href: () => '/payments?tab=wallets' },
  PAYMENT: { label: '매장 결제', href: () => '/payments?tab=payments' },
  POST: { label: '게시글', href: (id) => `/community?id=${id}` },
  HARMFUL_KEYWORD: { label: '차단 키워드', href: () => '/harmful-keywords' },
  NOTICE: { label: '공지', href: () => '/notices' },
  /* 서버 AuditTargetType 은 `INQUIRY` 다 — 답변 등록·수정·삭제가 모두 이 값으로 온다.
     `INQUIRY_ANSWER` 로 두었을 때는 대상 칸에 코드값이 그대로 찍혔다. */
  INQUIRY: { label: '1:1 문의', href: (id) => `/inquiries?id=${id}` },
  NOTIFICATION: { label: '전체 알림', href: () => '/notices' },
};

export interface AuditTarget {
  /** 우리말 종류 이름. 모르는 종류면 코드값을 그대로 쓴다. */
  label: string;
  /** 관리 화면 딥링크. 연결할 화면이 없으면 null. */
  href: string | null;
}

export function parseAuditTarget(
  targetType: string | null | undefined,
  targetId: number | null | undefined,
): AuditTarget {
  if (!targetType) return { label: '-', href: null };
  const known = TARGET_KINDS[targetType];
  return {
    label: known?.label ?? targetType,
    href: known && targetId != null ? known.href(targetId) : null,
  };
}
