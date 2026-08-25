# Claude 프로젝트 지침 — 케어가드 어드민 (H.A.C.K 관리자 웹)

> 이 문서를 다른 Claude 프로젝트의 **지침(Custom Instructions)** 에 그대로 붙여넣으면 된다.
> 저장소 루트의 `README.md` 와 함께 읽으면 전체 맥락이 잡힌다.
> 최종 갱신: 2026-08-25

---

## 1. 프로젝트

SK쉴더스 루키즈 최종 프로젝트(팀 **H.A.C.K**)의 **자녀보호앱 관리자 웹 콘솔**.

- 저장소: `HACK-rookies32/web` (private)
- 모바일 앱: Android / Kotlin (별도 저장소)
- 백엔드: Java / Spring Boot — JWT 인증, 응답 봉투 `{ success, data, error }`
- 이 저장소: **React 18 + Vite + TypeScript** 관리자 웹

**시나리오 기반 모의해킹 실습 프로젝트다.** 지금 만드는 것은 **정상(방어) 버전**이고, 취약 버전은 나중에 별도 브랜치로 분리한다. 악성코드나 무기화 코드는 작성하지 않는다.

백엔드가 아직 없어 **목(mock) 데이터로 동작**한다. `.env` 의 `VITE_USE_MOCK=true` 가 기본값이다.

---

## 2. 반드시 지킬 규칙

### 2.1 작업 시작 전 API 명세부터 확인한다

노션 MCP로 **"API 명세서"** 페이지를 먼저 조회하고, 이전에 파악한 내용과 달라진 점이 있는지 확인한 뒤 진행한다.

- 페이지 ID: `3c6d6d57-3bf6-80fe-a7cf-f9146f9805ee`
- 관리자 웹이 쓰는 부분은 **5장**(`/admin/...`)
- ⚠️ **문서 하단 "변경 이력"의 버전 번호만 보면 놓친다.** 버전이 v0.2 그대로인데도 엔드포인트가 추가·삭제된 사례가 여러 번 있었다. `/admin` 엔드포인트 목록을 직접 뽑아 이전과 비교할 것.
- 문서가 커서 `notion-fetch` 결과가 토큰 한도를 넘는다. 저장된 파일을 python으로 슬라이싱해 읽는다.
- **파란색으로 표시된 섹션 = 1차 완성(확정)** 이다. 검은색은 아직 바뀔 수 있다.

실제로 세션 중에 결제 모델이 통째로 교체된 적이 있다(구독/PG 대행 → 자체 지갑). 오래된 명세를 전제로 만들면 다시 짜야 한다.

### 2.2 충돌 시 우선순위

| 무엇이 충돌하나 | 무엇을 따르나 |
| --- | --- |
| 데이터·상태·값의 형식 | **API 명세** |
| CSS·색상·간격·타이포 | **Figma** |
| 화면 구조·메뉴 구성 | **핸드오프 문서의 "확정된 설계 결정"** |

실제 적용 예시:
- 문의 상태 → Figma는 3단계(대기중/처리중/완료)였지만 명세가 `answered: boolean` 이라 **명세를 따랐다**
- 카드 마스킹 → Figma는 뒤 4자리였지만 명세가 `1234-****-****-5678` 이라 **명세를 따랐다**
- 사이드바 → Figma에는 "리포트" 메뉴가 있지만 확정 결정이 "리포트 탭 없음"이라 **넣지 않았다**

충돌을 발견하면 임의로 고르지 말고 위 기준으로 정한 뒤, **어느 쪽을 택했는지 코드 주석과 보고에 남긴다.**

### 2.3 코드 규칙

- **색상 하드코딩 금지.** 반드시 `src/shared/styles/tokens.css` 의 CSS 변수만 쓴다.
- **feature 끼리 직접 import 금지.** 공유가 필요하면 `src/shared/` 를 경유한다. (예: 지갑 타입은 회원 관리와 자금·결제가 함께 써서 `shared/lib/wallet.ts` 에 있다)
- **개인정보는 반드시 `shared/lib/format.ts` 의 마스킹 유틸을 거쳐 표시한다.** 화면에서 직접 문자열을 자르지 않는다. (`maskName` `maskEmail` `maskPhone` `maskAddress` `maskCard` `maskIp`)
- 목록 파라미터(검색어·필터·페이지)는 **URL 쿼리로 관리**한다. 새로고침·링크 공유·뒤로 가기가 모두 동작해야 한다.
- 서버 상태는 TanStack Query. 쿼리 키는 feature 의 `api.ts` 에 `xxxKeys` 객체로 모아 둔다.
- 페이지는 라우트 단위 lazy 로드.
- 명세에 없는 API를 쓸 때는 `// TODO(api):` 주석으로 무엇이 없는지 남긴다.

### 2.4 권한

| 역할 | 접근 범위 |
| --- | --- |
| `SUPER_ADMIN` | 전체 |
| `GENERAL_ADMIN` | 회원 관리, 자금·결제(조회만) |
| `COMMUNITY_ADMIN` | 커뮤니티 관리 |
| `INQUIRY_ADMIN` | 1:1 문의 |

`SUPER_ADMIN` 전용: 관리자 계정 관리, 회원 삭제·수정, 계정 정지, 강제 환불, 지갑 잔액 조정, 감사 로그, 공지 CUD, 전체 알림 발송.

**권한이 없는 메뉴·버튼은 화면에서 숨긴다.**

> ⚠️ 프론트엔드의 권한 검사는 **UX 용**이다. 실제 접근 통제는 서버(Spring Security)가 담당한다. 프론트 가드를 믿고 서버 권한 검사를 생략하면 안 된다. 이 문장은 코드 주석으로도 남겨 둔다.

### 2.5 Git

```
main ←(PR)― dev ←(PR)― dev-minwook (엄민욱)
                     ←(PR)― dev-jooyoung (이주영)
```

- **`main` 에는 절대 push 하지 않는다.** 어느 정도 틀이 잡히고 구동 가능해질 때 팀에서 직접 올린다. 현재 `main` 은 최초 스캐폴드 커밋(`a8ac141`)에 멈춰 있다.
- 작업은 개인 브랜치에 커밋하고 `dev` 까지만 push 한다.
- 커밋 프리픽스: `feat:` `fix:` `refactor:` `style:`. 설명은 한글로 써도 된다. 화면 단위로 커밋한다.
- `shared/ui` 공통 컴포넌트를 고칠 때는 다른 화면에 영향이 가므로 팀원에게 공지한다.

### 2.6 화면 완료 기준 (DoD)

- 목록 / 상세 / 빈 / 로딩 / 에러 상태가 모두 렌더된다
- 역할별 노출·차단이 동작한다
- 페이징·검색 파라미터가 URL과 일관된다
- 디자인 토큰만 사용한다 (색상 하드코딩 없음)
- 키보드 포커스가 보인다
- 1440×1024 레이아웃이 깨지지 않는다 — 넓은 표는 **표 안에서만** 가로 스크롤하고 페이지 본문은 절대 가로로 밀리지 않는다
- **콘솔 에러 0**

---

## 3. 아키텍처

```
src/
├─ app/            # 라우터, 프로바이더, 전역 셸(Sidebar/Topbar), RouteErrorBoundary
├─ shared/
│  ├─ api/         # client.ts(axios+봉투 언랩+JWT), mock.ts(지연·페이징 유틸)
│  ├─ ui/          # 공통 컴포넌트 14종 (배럴: @/shared/ui)
│  ├─ auth/        # AuthContext, ProtectedRoute, useAuth, useRole
│  ├─ lib/         # types, constants(nav·roles), format(마스킹·CSV), status, wallet
│  └─ styles/      # tokens.css
├─ assets/         # Figma 아이콘 SVG · 로고
├─ mocks/          # 도메인별 목 데이터 (feature 간 공유 목은 여기 둔다)
└─ features/       # auth, dashboard, members, payments, notices, inquiries
                   # 한 feature = pages/ + components/ + api.ts + types.ts
```

**공통 UI 14종** (`@/shared/ui`): `Button` `Card` `PageHeader` `Table` `Pagination` `Modal` `SlideOver` `StatusPill` `Toast` `FormField`(+`TextInput` `TextArea` `Select` `Toggle`) `Tabs` `SearchInput` `EmptyState` `Spinner` `Icon`

- `Table` 은 컬럼 설정형 제네릭이고 **로딩·에러·빈 상태를 표 내부에서 처리**한다. 행 확장, 행 클릭, hover 시 노출되는 액션 칸을 지원한다.
- 새 화면을 만들 때 **공통 컴포넌트를 먼저 찾아 쓴다.** 비슷한 것을 새로 만들지 않는다.
- 개발 서버의 **`/ui-kit`** 경로에 스타일 가이드 페이지가 있다. 공통 컴포넌트를 고친 뒤 여기서 회귀를 눈으로 확인한다.

### 디자인 토큰 (Figma 실측)

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--accent` | `#f58220` | 주 버튼, 강조 |
| `--accent-strong` | `#964900` | 링크, 브랜드 텍스트 |
| `--bg` | `#fff8f5` | 페이지·사이드바 (웜 크림) |
| `--surface` | `#ffffff` | 카드·모달 |
| `--text-strong` / `--text` | `#241913` / `#564336` | 제목 / 본문 (웜 브라운) |
| `--border` | `#ddc1b0` | 테두리 |

서체 Noto Sans KR. radius 8px(입력·버튼) / 12px(카드) / 9999px(Pill). 라이트·다크 모두 지원.

---

## 4. 도메인 모델 핵심

### 응답 봉투 (명세 3.3)

모든 응답은 `{ success, data, error }` 로 감싸져 온다. `shared/api/client.ts` 의 응답 인터셉터가 봉투를 벗겨 `data` 만 돌려주므로 **컴포넌트는 봉투 구조를 몰라도 된다.** `success=false` 면 `ApiError` 를 던지고, 401 이면 `/login` 으로 보낸다.

페이징은 `page`(**0-base**) / `size` / `totalElements` / `totalPages`.

### 자금·결제 (자체 지갑 — 구독 모델은 폐기됨)

```
부모: 카드로 지갑 충전(CHARGE) → 자녀에게 용돈 이체(TRANSFER)
자녀: 지갑 잔액으로 매장 QR 결제(PAYMENT)
```

지갑 거래 원장 타입 7종: `CHARGE` `TRANSFER_IN` `TRANSFER_OUT` `PAYMENT` `REFUND` `RECLAIM` `ADJUST`

> **구독·포인트·PG 대행은 명세에서 삭제되었다.** 관련 용어(구독 상태, 플랜, 다음 결제일)를 다시 도입하지 말 것. `GET /admin/members/{id}/subscription` 이 명세 5.2에 아직 남아 있으나 삭제 누락으로 판단하고 사용하지 않는다.

### 1:1 문의

상태는 `status` 문자열이 아니라 **`answered: boolean`** 이다. 화면 표시는 `shared/lib/status.ts` 의 `inquiryStatus(answered)` 헬퍼를 쓴다.

---

## 5. 현재 진행 상태

### 완료된 화면 6개

| 화면 | 경로 | 비고 |
| --- | --- | --- |
| 로그인 | `/login` | 목 로그인(아무 값이나 통과) + 데모 역할 선택 4종 |
| 대시보드 | `/` | KPI 4 · 가입 추이 차트 · 최근 활동 · 최근 문의 |
| 회원 관리 | `/members` | 검색·필터·페이징, 행 확장, 빠른 보기 슬라이드오버 |
| 회원 상세 | `/members/:id` | 탭 3개(기본/기기/문의), CSV 리포트 모달 |
| 자금·결제 관리 | `/payments` | 탭 3개(충전/매장 결제/지갑), 강제 환불, 잔액 조정 |
| 공지 관리 | `/notices` | CRUD + 전체 알림 발송(2단계 확인) |
| 1:1 문의 | `/inquiries` | 답변 등록·수정·삭제, `?id=` 딥링크 |

### 남은 화면 4개 (`PlaceholderPage` 로 라우팅만 연결됨)

| 화면 | 경로 | 연동할 API |
| --- | --- | --- |
| 커뮤니티 관리 | `/community` | `GET /admin/community/posts`, `GET /admin/community/posts/{id}`, `DELETE /admin/community/posts/{id}`, `POST /admin/community/members/ban`, `GET /admin/community/reports` |
| 유해사이트 관리 | `/harmful-keywords` | `GET · POST /admin/harmful-keywords`, `DELETE /admin/harmful-keywords/{id}` |
| 감사 로그 | `/audit-logs` | `GET /admin/audit-logs` — **조회 전용(C/R만)**, 수정·삭제 버튼을 두지 않는다 |
| 관리자 계정 관리 | `/admins` | `GET /admin/admins`(배열 반환), `PATCH /admin/admins/{id}` |

> **감사 로그는 이미 데이터가 쌓이고 있다.** `src/mocks/auditLogs.ts` 에 목 저장소가 있고, 강제 환불·잔액 조정·공지 작성/삭제·회원 삭제/정지 시 항목이 추가된다. 감사 로그 화면을 만들면 바로 눈에 보인다. 서버 연동 후에는 서버가 자동 기록하므로 **프론트의 `appendAuditLog` 호출은 제거해야 한다.**

---

## 6. 백엔드 확인 대기 목록

명세에 없거나 어긋나서 확인이 필요한 항목. 새 작업 전에 해결됐는지 명세에서 확인할 것.

**자금·결제**
1. 지갑 **목록** 엔드포인트 없음 (단건 조회 `GET /admin/wallets/{userId}` 만 존재)
2. `GET /admin/charges` 응답에 회원 식별 정보(`userName`/`userEmail`) 없음 — 누가 충전했는지 알 수 없다
3. `402 INSUFFICIENT_BALANCE` 가 3.4 공통 에러 코드 표에 없음

**1:1 문의**
4. `GET /admin/inquiries` 가 배열이라 페이징 정보 없음 — `page`/`size` 지원 필요
5. 답변 수정/삭제만 경로가 `/api/admin/...` 이라 baseURL(`/api`)과 중복 → 현재 `/admin/...` 으로 통일해 호출 중

**커뮤니티** (남은 화면 담당자가 확인할 것)
6. `GET /admin/community/reports` 가 게시글용·댓글용 **두 개인데 경로가 같다** — `?type=POST|COMMENT` 또는 경로 분리 필요
7. `POST /admin/community/members/ban` 경로에 `{id}` 가 없고 Body에도 대상 회원이 없다 — 누구를 밴하는지 불명확

**회원**
8. 회원 목록에 `status` 필터 파라미터 없음 (현재 클라이언트 필터링)
9. `GET /admin/inquiries` 에 `memberId` 필터 없음
10. 관리자 전용 회원 생성 엔드포인트 없음 — `POST /auth/signup` 은 **인증이 없고 `role` 을 임의 지정할 수 있어** 관리자 화면에서 호출하면 안 된다. 그래서 "회원 추가" 버튼은 안내 토스트만 띄운다

---

## 7. 개발 환경 제약

- **Node.js 가 시스템에 설치되어 있지 않다.** 포터블로 `C:\Users\EZ\tools\nodejs` (v24.19.0 LTS)에 설치하고 사용자 PATH에 등록해 두었다. Bash 툴에서는 `export PATH="/c/Users/EZ/tools/nodejs:$PATH"` 가 필요하다. (다른 PC라면 이 항목은 무시)
- **Figma MCP는 Starter 플랜이라 호출 한도가 있다.** 디자인 토큰과 주요 컴포넌트 구조는 이미 추출해 `tokens.css` 에 반영했으므로 추가 호출 없이도 작업할 수 있다. 한도가 풀리면 직접 그린 아이콘(`features/dashboard/components/KpiCard.tsx`, `features/members/components/Glyphs.tsx`)을 Figma 원본으로 교체하면 좋다.
- Figma 파일: `YdID3StD0BGknABkdfYSYx`, 기준 폭 1280(콘텐츠 max-width 1440, 사이드바 256px)
- `npm install` 시 esbuild postinstall 경고가 뜨지만 빌드는 정상이다. 문제가 생기면 `npm approve-scripts esbuild`.

### 검증 방법

```bash
npm run build
```

타입 검사 + 프로덕션 빌드가 한 번에 돌아간다. **화면을 만들 때마다 빌드를 통과시킬 것.**

브라우저로 확인할 때는 개발 서버를 새로 띄우고 새 탭에서 볼 것. **파일을 여러 번 고친 뒤에는 HMR 재적재 실패가 콘솔에 잔뜩 쌓여** 진짜 에러와 구분이 안 된다. `rm -rf node_modules/.vite && npm run dev` 로 재시작하면 깨끗해진다.

목 로그인 대신 콘솔에서 세션을 직접 넣으면 역할 전환이 빠르다.

```js
localStorage.setItem('careguard.auth', JSON.stringify({
  token: 'mock.t', username: 'admin01', displayName: 'admin01', role: 'SUPER_ADMIN'
}));
```

---

## 8. 소통 방식

- 한국어로 소통한다.
- 코드는 생략 없이 전체로 작성한다.
- 명세와 어긋나는 점, 화면이 요구하는데 API가 없는 점을 발견하면 **임의로 넘어가지 말고 보고한다.** 그동안 이 방식으로 백엔드 요청 4건이 반영됐다.
- 작업을 마치면 무엇을 검증했는지 구체적으로 밝힌다(무엇을 클릭했고 무엇이 어떻게 바뀌었는지). "동작합니다" 로만 끝내지 않는다.
