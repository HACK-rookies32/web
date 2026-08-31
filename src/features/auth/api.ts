import { USE_MOCK, request } from '@/shared/api/client';
import { mockResponse } from '@/shared/api/mock';
import type { LoginResult } from '@/shared/lib/types';
import type { LoginRequest } from './types';

/**
 * 관리자 로그인.
 * 실제: POST /admin/auth/login → { token, username, role }
 *
 * 요청 본문의 아이디 필드는 `loginId` 다(명세 5.1). 응답은 같은 값을
 * `username` 으로 내려주므로 요청과 응답의 이름이 서로 다르다. 명세 그대로이며
 * 오타가 아니다 — 회원 API(5.2)에서는 `username` 이 실명을 뜻하므로,
 * 관리자 응답의 `username` 을 실명으로 오해하지 않도록 주의한다.
 *
 * 역할은 **서버 응답으로만** 정해진다. 목 모드에서는 아이디·비밀번호를 검증하지
 * 않고 통과시키되 역할은 최고 권한으로 고정한다 — 화면에서 역할을 고르게 두면
 * 권한을 클라이언트가 정하는 모양이 되고, 그 입력 경로가 그대로 남는다.
 */
export async function login(body: LoginRequest): Promise<LoginResult> {
  if (USE_MOCK) {
    return mockResponse<LoginResult>({
      token: `mock.${btoa(unescape(encodeURIComponent(body.loginId)))}.${Date.now()}`,
      username: body.loginId,
      role: 'SUPER_ADMIN',
    });
  }

  return request<LoginResult>({ url: '/admin/auth/login', method: 'POST', data: body });
}

/**
 * 관리자 로그아웃. `POST /admin/auth/logout`
 *
 * 신설을 요청해 둔 엔드포인트가 서버에 반영됐다. 이전에는 이 경로가 없어
 * (모바일용 `POST /auth/logout` 은 PARENT 전용이라 관리자 토큰으로는 403)
 * 브라우저의 토큰만 지우고 있었고, **서버 세션과 재발급 토큰이 그대로 살아**
 * 토큰이 유출되면 로그아웃 뒤에도 갱신이 가능했다.
 *
 * 실패해도 예외를 밖으로 던지지 않는다. 서버 호출이 안 되더라도 로컬 세션은
 * 반드시 정리해야 하기 때문이다 — 로그아웃이 실패해 화면에 남는 쪽이 더 위험하다.
 * 대신 서버 세션이 남았을 수 있다는 사실은 콘솔에 남긴다.
 */
export async function logout(): Promise<void> {
  if (USE_MOCK) return;

  try {
    await request<void>({ url: '/admin/auth/logout', method: 'POST' });
  } catch (error) {
    console.warn('[auth] 서버 로그아웃에 실패했다. 서버 세션이 남아 있을 수 있다.', error);
  }
}
