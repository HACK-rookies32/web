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

