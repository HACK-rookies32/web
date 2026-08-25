import { USE_MOCK, request } from '@/shared/api/client';
import { mockResponse } from '@/shared/api/mock';
import type { LoginResult } from '@/shared/lib/types';
import type { LoginRequest, MockLoginRequest } from './types';

/**
 * 관리자 로그인.
 * 실제: POST /admin/auth/login → { token, username, role }
 *
 * 목 모드에서는 아이디·비밀번호를 검증하지 않고 통과시킨다.
 * (프로토타입 단계에서 화면 흐름을 확인하는 것이 목적)
 */
export async function login(body: MockLoginRequest): Promise<LoginResult> {
  if (USE_MOCK) {
    return mockResponse<LoginResult>({
      token: `mock.${btoa(unescape(encodeURIComponent(body.username)))}.${Date.now()}`,
      username: body.username,
      role: body.role,
    });
  }

  const payload: LoginRequest = { username: body.username, password: body.password };
  return request<LoginResult>({ url: '/admin/auth/login', method: 'POST', data: payload });
}

/**
 * 로그아웃.
 * 명세 4.1 의 POST /auth/logout 은 모바일용이며 관리자 전용 엔드포인트는 아직 없다.
 * 지금은 클라이언트에서 토큰만 폐기한다.
 */
export async function logout(): Promise<void> {
  if (USE_MOCK) return mockResponse(undefined, 120);
  return request<void>({ url: '/auth/logout', method: 'POST' });
}
