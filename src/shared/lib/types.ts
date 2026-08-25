/**
 * 전역 공용 타입.
 * 도메인 전용 타입은 각 feature 의 types.ts 에 둔다.
 *
 * 기준 문서: "요구사항 명세 + API 명세 v0.2" (2026-08-25)
 */

/* ---------------------------------------------------------------- 권한 ---- */

/**
 * 관리자 역할. 값은 API 명세 1.3 및 POST /admin/auth/login 의 data.role 과 동일하다.
 *
 * - SUPER_ADMIN     : 슈퍼관리자 (최고 권한)
 * - GENERAL_ADMIN   : 일반관리자 (관리자 중 최하위) — 회원·결제 조회, 문의 응대
 * - COMMUNITY_ADMIN : 커뮤니티 게시판 담당
 * - INQUIRY_ADMIN   : 1:1 문의게시판 담당
 *
 * NOTE: 명세 5장 일부에 `ADMIN_SUPER` / `ADMIN_CS` 같은 옛 표기가 남아 있으나,
 *       1.3 표와 로그인 응답 예시가 최신이므로 이 파일의 표기를 정본으로 삼는다.
 *       PARENT / CHILD 는 모바일 앱 역할이라 관리자 웹에서는 다루지 않는다.
 */
export type Role = 'SUPER_ADMIN' | 'GENERAL_ADMIN' | 'COMMUNITY_ADMIN' | 'INQUIRY_ADMIN';

/** GET /admin/admins 의 원소. */
export interface AdminUser {
  id: number;
  username: string;
  nickname: string;
  email: string;
  phoneNumber: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

/** POST /admin/auth/login 의 data. */
export interface LoginResult {
  token: string;
  username: string;
  role: Role;
}

/* ------------------------------------------------------------ API 봉투 ---- */

/** 백엔드 공통 응답 봉투 (명세 3.3): { success, data, error } */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: ApiErrorBody | null;
}

/** 명세 3.4 공통 에러 코드. */
export type ApiErrorCode =
  | 'INVALID_PARAMETER'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'NETWORK'
  | 'UNKNOWN';

export interface ApiErrorBody {
  code: ApiErrorCode | string;
  message: string;
}

/** 목록 응답 공통 형태 (명세 3.5). page 는 0-base. */
export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** 목록 조회 공통 쿼리 파라미터. */
export interface PageParams {
  page?: number;
  size?: number;
  keyword?: string;
}

/* -------------------------------------------------------------- 기타 ---- */

/** 상태 Pill 의 시각적 톤. 색뿐 아니라 형태로도 구분되도록 사용한다. */
export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';

export interface ToastMessage {
  id: string;
  tone: Exclude<Tone, 'accent'>;
  title: string;
  description?: string;
}
