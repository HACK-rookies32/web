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
 * 명세 5.8 표에서 **서버에 대응 엔드포인트가 있는 것만** 남겼다.
 * `MEMBER_BAN` · `MEMBER_UNBAN` 은 표에 있으나 밴 API 가 없어져 발생할 수 없다.
 * `ADMIN_LOGIN` 은 표에 없지만 실서버에서 실제로 쌓이는 것을 확인했다.
 */
export type AuditActivityType =
  | 'ADMIN_LOGIN'
  | 'MEMBER_UPDATE'
  | 'MEMBER_DELETE'
  | 'MEMBER_ROLE_UPDATE'
  | 'WALLET_BALANCE_ADJUST'
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
  MEMBER_UPDATE: '회원 정보 수정',
  MEMBER_DELETE: '회원 삭제',
  MEMBER_ROLE_UPDATE: '관리자 권한 변경',
  WALLET_BALANCE_ADJUST: '지갑 잔액 수동 조정',
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
 * `REPORT_DOWNLOAD` 는 뺀다 — 명세 5.8 표에 없어 서버가 이 값으로 필터링해 주지
 * 않는다. CSV 다운로드도 감사 대상이므로 표에 추가해 달라고 요청해 둔 상태이고,
 * 반영되면 이 예외를 지운다.
 */
export const AUDIT_FILTER_ACTIVITIES = (
  Object.keys(AUDIT_ACTIVITY_LABEL) as AuditActivityType[]
).filter((type) => type !== 'REPORT_DOWNLOAD');

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
  INQUIRY_ANSWER: { label: '문의 답변', href: (id) => `/inquiries?id=${id}` },
  NOTIFICATION: { label: '전체 알림', href: () => '/notices' },
};

export interface AuditTarget {
  /** 우리말 종류 이름. 모르는 종류면 코드값을 그대로 쓴다. */
  label: string;
  /** 관리 화면 딥링크. 연결할 화면이 없으면 null. */
  href: string | null;
}

export function parseAuditTarget(targetType: string, targetId: number): AuditTarget {
  const known = TARGET_KINDS[targetType];
  return {
    label: known?.label ?? targetType,
    href: known ? known.href(targetId) : null,
  };
}
