# 웹 취약점 분석 및 대응 — 케어가드 어드민

> 진단 실습용 문서 (출제자·팀 내부용). 트레이니에게는 공개하지 않는다.
>
> 이 저장소는 **두 버전**으로 갈린다.
> - **취약 버전** — `dev` · `main` (클라우드 배포본, 진단 대상)
> - **대응 버전** — `secure/careguard-web` (이 문서가 있는 브랜치, 통제 적용본)
>
> 아래는 ① 웹 취약점 종류와 표준 대응방안, ② 우리 코드에서 각 취약점이
> 성립하는 지점, ③ 대응 버전이 적용한 통제를 한데 모은 것이다.

---

## 0. 두 버전의 차이 요약

취약 버전은 대응 버전에서 아래 통제를 **걷어낸** 것이다. 진단 대상은 취약 버전
(`dev`/`main`)이고, 각 항목의 정답은 대응 버전(`secure/careguard-web`)에 있다.

| ID | 취약점 | OWASP 2021 | 취약 지점 (파일) | 대응 |
| --- | --- | --- | --- | --- |
| W-01 | 저장형 XSS — 문의 본문을 HTML 로 렌더 | A03 Injection | `inquiries/components/InquiryDetailPanel.tsx` | 텍스트로 렌더 + CSP |
| W-02 | 저장형 XSS — 커뮤니티 게시글·댓글 HTML 렌더 | A03 | `community/components/CommunityDetailPanel.tsx` | 텍스트로 렌더 + CSP |
| W-03 | DOM XSS — 첨부·링크 스킴 가드 제거 | A03 | `shared/ui/AttachmentLink.tsx` | 스킴 허용목록 |
| W-04 | 접근통제 실패 — 라우트 역할 가드 제거 | A01 Broken Access Control | `app/App.tsx` | 역할별 라우트 가드 |
| W-05 | 권한 상승 — 파괴적 작업을 전 역할에 노출 | A01 | `members/pages/MembersPage.tsx`·`payments/pages/PaymentsPage.tsx` | `SUPER_ADMIN` 게이트 |
| W-06 | 민감정보 노출 — 검색으로 마스킹 역추론 | A01 / A09 | `admins/pages/AdminsPage.tsx` | 검색 대상 제한 |
| W-07 | 리버스 탭내빙·Referrer 유출 | A05 Misconfiguration | `notices/pages/NoticesPage.tsx`·`inquiries/.../InquiryDetailPanel.tsx` | `rel="noreferrer noopener"` |
| W-08 | 보안 응답 헤더 부재 (CSP·XFO 등) | A05 | `nginx/default.conf.template` | 보안 헤더 6종 |
| W-09 | CSV 수식 주입 | A03 (CWE-1236) | `shared/lib/format.ts` | 위험 셀 접두 이스케이프 |

> 서버·인프라 이관 항목(웹에서 못 막는 것)은 9장에 별도로 모았다.

---

## 1. 웹 취약점 종류 및 표준 대응방안 (OWASP Top 10 2021 기준)

### A01 — Broken Access Control (접근통제 실패)

- **원리** — 사용자가 자기 권한을 벗어난 자원·기능에 접근한다. 2021 판에서
  1위이며 테스트 대상 앱의 94%에서 발견됐다. 수직적(권한 상승)·수평적(타
  사용자 자원)·기능 수준(숨은 관리 기능) 접근으로 나뉜다.
- **표준 대응**
  - **기본 거부(deny by default)** — 공개 자원 외에는 전부 막고 필요한 것만 연다.
  - **서버에서 강제** — 클라이언트 가드는 UX 일 뿐이다. 실제 통제는 서버가 하고,
    화면은 그것을 보조한다.
  - **접근통제를 한곳에 구현해 재사용** — 화면마다 흩어 놓으면 누락이 생긴다.
  - **레코드 소유권 검증** — id 만 바꿔 남의 자원을 읽지 못하게 한다(IDOR 방지).

### A02 — Cryptographic Failures (암호 실패)

- **원리** — 전송·저장 중 민감정보가 평문이거나 약한 암호로 보호된다.
- **표준 대응** — 전송 구간 TLS 강제(HSTS), 저장 시 암호화, 민감정보 최소 수집,
  캐시 금지 헤더, 토큰·비밀을 안전한 저장소에 둔다.

### A03 — Injection (XSS 포함)

- **원리** — 신뢰할 수 없는 입력이 코드·쿼리로 해석된다. 2021 판에서 **XSS 가
  Injection 으로 흡수**됐다(피해자 브라우저에 대한 JS 주입).
  - **저장형 XSS** — 공격자가 남긴 값이 저장됐다가 다른 사용자(여기선 관리자)
    화면에서 실행된다. 관리 콘솔에서 가장 위험하다.
  - **DOM XSS** — `href="javascript:..."`, `innerHTML` 등 위험한 싱크에 입력이 닿는다.
- **표준 대응**
  - **출력 인코딩** — 사용자 데이터를 코드가 아니라 텍스트로 표시한다.
  - **위험 싱크 회피** — `dangerouslySetInnerHTML`·`innerHTML`·`javascript:` 를 쓰지 않는다.
  - **Content-Security-Policy** — 인라인 스크립트·이벤트 핸들러 실행을 차단해
    XSS 의 2차 방어선을 만든다.
  - **URL 스킴 허용목록** — 링크·리다이렉트에 http/https·같은 출처만 허용한다.

### A04 — Insecure Design (안전하지 않은 설계)

- **원리** — 구현이 아니라 설계 단계의 통제 부재. 위협 모델링·안전한 기본값 부재.
- **표준 대응** — 위협 모델링, 안전한 기본값, 파괴적 작업에 확인 절차,
  기능별 최소권한 설계.

### A05 — Security Misconfiguration (보안 설정 오류)

- **원리** — 기본 설정 방치, 불필요한 기능 노출, **보안 헤더 부재**, 상세 오류 노출.
  전 세계 사이트의 82%가 CSP 헤더를 누락하고 있다.
- **표준 대응**
  - **보안 응답 헤더** — CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options`
    /CSP `frame-ancestors`(클릭재킹), `Referrer-Policy`, `Strict-Transport-Security`,
    `Permissions-Policy`.
  - **불필요 기능 제거** — 내부용 화면·미사용 라우트·개발 산출물을 운영에서 뺀다.
  - **외부 링크** — `rel="noreferrer noopener"` 로 탭내빙·Referrer 유출을 막는다.

### A06 — Vulnerable and Outdated Components (취약·구버전 구성요소)

- **원리** — 알려진 취약점이 있는 라이브러리 사용.
- **표준 대응** — 의존성 정기 점검(`npm audit`), 상시 업데이트, 미사용 의존성 제거.

### A07 — Identification and Authentication Failures (인증 실패)

- **원리** — 약한 인증·세션 관리. 크리덴셜 스터핑, 세션 미만료, 토큰 노출.
- **표준 대응** — 서버측 세션 무효화(로그아웃), 실패 시 자격증명 폐기(401),
  토큰을 안전하게 저장, 로그인 시도 제한(서버).

### A08 — Software and Data Integrity Failures (무결성 실패)

- **원리** — 검증 없는 업데이트·의존성·역직렬화.
- **표준 대응** — 패키지 무결성 검증(lockfile·서명·체크섬), 신뢰 배포처만 사용.

### A09 — Security Logging and Monitoring Failures (로깅·탐지 실패)

- **원리** — 위험 행위가 기록되지 않아 침해를 탐지·추적할 수 없다.
- **표준 대응** — 접근통제 결정·권한 변경·파괴적 작업을 기록하고, 로그에
  개인정보를 남기지 않으며, 조사 가능한 형태(수행자·사유)로 남긴다.

### A10 — Server-Side Request Forgery (SSRF)

- **원리** — 서버가 검증 없이 사용자가 준 URL 로 요청한다. (주로 서버측 이슈)
- **표준 대응** — 대상 URL 허용목록, 내부 대역 차단. (이 웹 저장소 범위 밖)

---

## 2. 우리 코드의 취약 지점과 대응 (상세)

### W-01 · 저장형 XSS — 1:1 문의 본문

- **취약 버전** — `InquiryDetailPanel.tsx` 가 회원이 작성한 본문을
  `dangerouslySetInnerHTML={{ __html: data.content }}` 로 렌더한다. 회원이 앱·API 로
  `<img src=x onerror="fetch('/api/admin/...')">` 를 문의 본문에 넣으면, 관리자가
  그 문의를 여는 순간 **관리자 세션에서** 스크립트가 실행된다.
- **영향** — 관리자 토큰으로 회원 삭제·자금 조작·감사 로그 열람까지 도달.
- **대응 버전** — `{data.content}` 로 렌더(React 자동 이스케이프) + CSP `script-src 'self'`.

### W-02 · 저장형 XSS — 커뮤니티 게시글·댓글

- **취약 버전** — `CommunityDetailPanel.tsx` 가 게시글 본문과 댓글을 HTML 로 렌더.
  회원 작성 콘텐츠라 W-01 과 같은 저장형 XSS.
- **대응 버전** — 텍스트 렌더 + CSP.

### W-03 · DOM XSS — 첨부·링크 스킴 가드

- **취약 버전** — `AttachmentLink.tsx` 의 `isSafeFileHref` 가 항상 true 를 돌려주어
  `javascript:...` 첨부 경로·문의 링크가 클릭 가능한 `<a href>` 로 렌더된다.
  회원이 첨부/링크 값에 `javascript:` 스킴을 넣으면 관리자가 클릭 시 실행.
- **대응 버전** — 허용목록(같은 출처 절대경로·http·https)만 링크로 만들고,
  그 밖은 텍스트로만 표시.

### W-04 · 접근통제 실패 — 라우트 역할 가드

- **취약 버전** — `App.tsx` 가 모든 화면을 `ProtectedRoute`(인증만) 아래 두고
  역할 제한을 걷어냈다. `INQUIRY_ADMIN`·`COMMUNITY_ADMIN` 등 낮은 권한 계정이
  주소창에 `/admins`·`/payments`·`/audit-logs` 를 직접 쳐서 들어간다.
- **대응 버전** — 화면군별 역할 가드
  (회원·자금 = `SUPER_ADMIN`·`GENERAL_ADMIN`, 공지·키워드·감사·관리자 = `SUPER_ADMIN`,
  문의 = `SUPER_ADMIN`·`INQUIRY_ADMIN`, 커뮤니티 = 3역할).

### W-05 · 권한 상승 — 파괴적 작업 노출

- **취약 버전** — `MembersPage.tsx`·`PaymentsPage.tsx` 의 `canManage = hasRole()`
  (인증만 되면 참). 회원 수정·삭제·충전취소·잔액조정 버튼이 전 역할에 노출된다.
- **대응 버전** — `canManage = hasRole(['SUPER_ADMIN'])`.
- **주의** — 이건 화면 노출 제어일 뿐이다. 서버가 `SUPER_ADMIN` 으로 강제하지
  않으면 API 직접 호출로 우회된다(9장 서버 이관 참조).

### W-06 · 민감정보 노출 — 검색 오라클

- **취약 버전** — `AdminsPage.tsx` 의 `matchesAdminKeyword` 가 이메일·전화번호를
  **부분일치**로 검색한다. 화면에는 `min***@…`·`010-****-8890` 으로 가려 두고도,
  가운데 번호·가린 로컬파트를 조각으로 질의해 결과 유무로 되짚을 수 있다
  (ISMS-P 3.2.3 "like 검색을 통한 과도한 정보 조회").
- **대응 버전** — 검색을 아이디·닉네임(노출값)과 이메일 앞 3자 시작·전체 일치,
  전화 뒤 4자리 일치로만 허용.

### W-07 · 리버스 탭내빙·Referrer 유출

- **취약 버전** — 공지 링크·문의 링크의 `<a target="_blank">` 에서
  `rel="noreferrer noopener"` 를 제거. 열린 탭이 `window.opener` 로 원래 탭을
  조작(피싱 리다이렉트)하고, Referrer 로 내부 경로가 새 나간다.
- **대응 버전** — 외부 링크에 `rel="noreferrer noopener"` 유지.

### W-08 · 보안 응답 헤더 부재

- **취약 버전** — `nginx/default.conf.template` 에 CSP·`X-Frame-Options`·nosniff·
  `Referrer-Policy`·HSTS·`Permissions-Policy` 가 없다. XSS(W-01~03)가 성립했을 때
  막을 2차 방어선이 없고, iframe 삽입(클릭재킹)이 열린다.
- **대응 버전** — 문서 응답(`location /`)에 보안 헤더 6종, 정적 자산에 nosniff.
  특히 CSP `script-src 'self'` 가 W-01~03 의 페이로드 실행을 차단한다.

### W-09 · CSV 수식 주입

- **취약 버전** — `format.ts` 의 `csvCell` 이 `=`·`+`·`-`·`@` 로 시작하는 값을
  그대로 내보낸다. 회원 이름·주소에 `=HYPERLINK("http://evil","보기")` 를 넣어
  두면 관리자가 CSV 를 열 때 Excel 이 수식으로 실행한다.
- **대응 버전** — 위험 접두 문자로 시작하는 셀 앞에 작은따옴표를 붙여 텍스트 강제.

---

## 3. 대응 체크리스트

| 점검 항목 | 취약 버전 | 대응 버전 |
| --- | --- | --- |
| 회원 작성 본문이 코드로 실행되는가 | 실행됨(W-01·02) | 텍스트 + CSP 차단 |
| `javascript:` 링크가 클릭 실행되는가 | 실행됨(W-03) | 허용목록 차단 |
| 낮은 권한이 관리 화면에 들어가는가 | 들어감(W-04) | 라우트 가드 |
| 낮은 권한에 파괴적 버튼이 보이는가 | 보임(W-05) | `SUPER_ADMIN` 게이트 |
| 검색으로 가린 연락처를 되짚는가 | 되짚음(W-06) | 검색 대상 제한 |
| 외부 링크가 opener·referrer 를 넘기는가 | 넘김(W-07) | `rel` 차단 |
| 보안 헤더가 있는가 | 없음(W-08) | 헤더 6종 |
| CSV 셀이 수식으로 실행되는가 | 실행됨(W-09) | 접두 이스케이프 |

---

## 9. 서버·인프라 이관 항목 (웹에서 못 막는 것)

대응 버전에서도 아래는 웹 프론트만으로 닫을 수 없다. 서버·인프라에 요청·이관한다.

- **파일 다운로드 무인증** — `GET /api/files/{category}/{filename}` 이 인증 없이
  열린다. 문의 첨부(영수증·스크린샷)에 개인정보가 담길 수 있다. 서버 인증 필요.
- **자금 API 권한** — 충전 취소·잔액 조정이 `GENERAL_ADMIN` 에도 열려 있고
  컨트롤러가 역할을 재확인하지 않는다. 서버에서 `SUPER_ADMIN` 강제 필요
  (W-05 의 프론트 게이트는 API 직접 호출로 우회 가능).
- **서버측 검색 대상** — `GET /admin/finance/charges` 의 `keyword` 가 이메일
  부분일치라 W-06 이 서버에서도 재현된다. 검색 대상에서 이메일 제외 요청.
- **토큰 저장 방식** — 관리자 토큰이 `localStorage` 에 평문이다. XSS 1회로
  전량 탈취된다. 저장형 XSS(W-01~03)와 결합 시 위험이 커진다.
- **의존성** — `npm audit` 상 개발 서버 전용(vite·esbuild) 이슈. 배포물에는
  포함되지 않으나 상시 점검 대상.

---

## 참고

- OWASP Top 10 2021 — https://owasp.org/Top10/
- OWASP XSS Prevention Cheat Sheet
- OWASP HTTP Security Response Headers Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html
- OWASP Clickjacking Defense Cheat Sheet (CSP `frame-ancestors`)
- CWE-79 (XSS) · CWE-1236 (CSV Injection) · CWE-1220 (접근통제 세분화) · CWE-200 (정보 노출)
