import type { Role } from '@/shared/lib/types';

/** POST /admin/auth/login 요청 본문 (API 명세 5.1). */
export interface LoginRequest {
  username: string;
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
