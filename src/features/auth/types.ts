import type { Role } from '@/shared/lib/types';

/**
 * POST /admin/auth/login 요청 본문 (API 명세 5.1).
 *
 * 아이디 필드는 `loginId` 다. 응답(LoginResult)은 같은 값을 `username` 으로
 * 내려주므로 요청과 응답의 이름이 다르다 — 명세 그대로다.
 */
export interface LoginRequest {
  loginId: string;
  password: string;
}

/**
 * 목 로그인 전용 확장.
 * 백엔드가 없는 동안 화면별 권한 동작을 확인하기 위해 역할을 직접 고른다.
 * 실제 연동 시에는 서버가 내려주는 role 을 쓰므로 이 필드는 사라진다.
 */
export interface MockLoginRequest extends LoginRequest {
  role: Role;
}
