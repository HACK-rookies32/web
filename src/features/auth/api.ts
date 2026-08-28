import { USE_MOCK, request } from '@/shared/api/client';
import { mockResponse } from '@/shared/api/mock';
import type { LoginResult } from '@/shared/lib/types';
import type { LoginRequest, MockLoginRequest } from './types';

/**
 * 관리자 로그인.
 * 실제: POST /admin/auth/login → { token, username, role }
 *
 * 요청 본문의 아이디 필드는 `loginId` 다(명세 5.1). 응답은 같은 값을
 * `username` 으로 내려주므로 요청과 응답의 이름이 서로 다르다. 명세 그대로이며
 * 오타가 아니다 — 회원 API(5.2)에서는 `username` 이 실명을 뜻하므로,
 * 관리자 응답의 `username` 을 실명으로 오해하지 않도록 주의한다.
 *
 * 목 모드에서는 아이디·비밀번호를 검증하지 않고 통과시킨다.
 * (프로토타입 단계에서 화면 흐름을 확인하는 것이 목적)
 */
export async function login(body: MockLoginRequest): Promise<LoginResult> {
  if (USE_MOCK) {
    return mockResponse<LoginResult>({
      token: `mock.${btoa(unescape(encodeURIComponent(body.loginId)))}.${Date.now()}`,
      username: body.loginId,
      role: body.role,
    });
  }

  const payload: LoginRequest = { loginId: body.loginId, password: body.password };
  return request<LoginResult>({ url: '/admin/auth/login', method: 'POST', data: payload });
}

/*
 * 로그아웃 API 는 두지 않는다.
 *
 * 서버에 관리자 로그아웃 엔드포인트가 없다 —
 *   POST /api/admin/auth/logout   → 500 (라우트 없음)
 *   POST /api/auth/logout         → 존재하지만 **PARENT 전용**
 *                                   ("PARENT 만 호출 가능", 명세 4.1)
 * 관리자 토큰으로 모바일 것을 부르면 403 이다.
 *
 * 그래서 AuthContext 의 signOut 이 localStorage 의 토큰만 지운다.
 *
 * ⚠️ 서버 세션(refresh token)은 그대로 살아 있다. 토큰이 유출되면 로그아웃 뒤에도
 *    갱신이 가능하다. 백엔드에 관리자 로그아웃 신설을 요청해 둔 상태이고,
 *    생기면 여기에 붙이고 signOut 에서 호출한다.
 */
