/** 여러 관리자 feature와 목 저장소가 함께 사용하는 감사 로그 활동 규격. */
export type AuditAction =
  | 'MEMBER_UPDATE'
  | 'MEMBER_DELETE'
  | 'PAYMENT_REFUND'
  | 'WALLET_ADJUST'
  | 'NOTICE_CREATE'
  | 'NOTICE_UPDATE'
  | 'NOTICE_DELETE'
  | 'POST_DELETE'
  | 'MEMBER_BAN'
  | 'KEYWORD_CREATE'
  | 'KEYWORD_DELETE'
  | 'ADMIN_ROLE_UPDATE'
  | 'REPORT_DOWNLOAD';

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  MEMBER_UPDATE: '회원 정보 수정',
  MEMBER_DELETE: '회원 삭제',
  PAYMENT_REFUND: '환불 처리',
  WALLET_ADJUST: '지갑 잔액 수동 조정',
  NOTICE_CREATE: '공지 작성',
  NOTICE_UPDATE: '공지 수정',
  NOTICE_DELETE: '공지 삭제',
  POST_DELETE: '게시글 삭제',
  MEMBER_BAN: '사용자 밴',
  KEYWORD_CREATE: '차단 키워드 추가',
  KEYWORD_DELETE: '차단 키워드 제외',
  ADMIN_ROLE_UPDATE: '관리자 권한 변경',
  REPORT_DOWNLOAD: '리포트 다운로드',
};

/**
 * 감사 로그 화면의 활동 유형 필터에 노출할 값.
 *
 * 위 AUDIT_ACTION_LABEL 은 목록에 이미 쌓인 로그를 그리는 데 쓰므로 전체를
 * 유지하고, 필터 드롭다운만 실제로 사용하는 유형으로 좁힌다. 둘을 같이 줄이면
 * 과거 로그의 활동명이 코드값 그대로 노출된다.
 */
export const AUDIT_FILTER_ACTIONS: AuditAction[] = [
  'MEMBER_DELETE',
  'WALLET_ADJUST',
  'PAYMENT_REFUND',
  'POST_DELETE',
];

/**
 * 감사 로그 목록 쿼리 키.
 *
 * 감사 대상 활동은 회원·자금·공지·커뮤니티 등 여러 feature 에서 일어나는데,
 * feature 끼리는 서로 import 하지 않는 것이 이 프로젝트의 규칙이다.
 * 그래서 키만 shared 로 올려 두고, 각 feature 는 `useAuditLogSync()` 로 무효화한다.
 * (`features/audit-logs/api.ts` 의 auditLogKeys 도 이 값을 뿌리로 쓴다)
 */
export const AUDIT_LOG_QUERY_KEY = ['audit-logs'] as const;

/* ------------------------------------------------------------- 대상 ---- */

/**
 * 감사 로그의 `target` 은 `"member:1001"` 처럼 `종류:식별자` 문자열이다(명세 5.8 예시).
 * 표에 그대로 찍으면 관리자가 무엇을 가리키는지 알 수 없어서, 종류를 우리말로
 * 풀고 해당 관리 화면으로 가는 링크를 붙인다.
 */
export interface AuditTarget {
  /** 파싱 전 원본. 알 수 없는 형식이면 이 값만 보여준다. */
  raw: string;
  /** `member` 처럼 콜론 앞부분. 파싱 실패 시 빈 문자열. */
  kind: string;
  /** 콜론 뒷부분. 숫자가 아닐 수도 있다(예: `broadcast:PUSH`). */
  id: string;
  /** 우리말 종류 이름. 모르는 종류면 kind 를 그대로 쓴다. */
  label: string;
  /** 관리 화면 딥링크. 연결할 화면이 없으면 null. */
  href: string | null;
}

const TARGET_KINDS: Record<string, { label: string; href: (id: string) => string | null }> = {
  member: { label: '회원', href: (id) => `/members/${id}` },
  post: { label: '게시글', href: (id) => `/community?id=${id}` },
  notice: { label: '공지', href: () => '/notices' },
  broadcast: { label: '전체 알림', href: () => '/notices' },
  inquiry: { label: '문의', href: (id) => `/inquiries?id=${id}` },
  payment: { label: '매장 결제', href: () => '/payments?tab=payments' },
  charge: { label: '충전', href: () => '/payments?tab=charges' },
  wallet: { label: '지갑', href: () => '/payments?tab=wallets' },
  keyword: { label: '차단 키워드', href: () => '/harmful-keywords' },
  admin: { label: '관리자 계정', href: () => '/admins' },
  report: { label: '리포트', href: () => null },
};

export function parseAuditTarget(raw: string): AuditTarget {
  const separator = raw.indexOf(':');
  if (separator < 0) {
    return { raw, kind: '', id: '', label: raw, href: null };
  }

  const kind = raw.slice(0, separator);
  const id = raw.slice(separator + 1);
  const known = TARGET_KINDS[kind];

  return {
    raw,
    kind,
    id,
    label: known?.label ?? kind,
    href: known ? known.href(id) : null,
  };
}
