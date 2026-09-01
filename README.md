# kidhack 어드민 (H.A.C.K 관리자 웹)

자녀보호앱 관리자 웹 콘솔. SK쉴더스 루키즈 최종 프로젝트 — 팀 **H.A.C.K**.

- **모바일 앱**: Android / Kotlin (별도 저장소)
- **백엔드**: Java / Spring Boot — JWT 인증, 응답 봉투 `{ success, data, error }`
- **관리자 웹**: 이 저장소. React 18 + Vite + TypeScript

> 시나리오 기반 모의해킹 실습 프로젝트입니다. 이 저장소는 **정상(방어) 버전**이며,
> 취약 버전은 이후 별도 브랜치로 분리합니다.

---

## 실행 방법

Node.js 20 이상이 필요합니다 (개발 환경 기준: v24.19.0 LTS).

```bash
npm install
```

```bash
npm run dev
```

`http://localhost:5173` 에서 열립니다.

| 스크립트 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 (HMR) |
| `npm run build` | 타입 검사 후 프로덕션 빌드 (`dist/`) |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run typecheck` | 타입 검사만 실행 |

### 환경 변수

`.env.example` 을 `.env` 로 복사해 사용합니다.

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `VITE_USE_MOCK` | `true` | `true` 면 `src/mocks` 의 목 데이터, `false` 면 실제 API |
| `VITE_API_BASE_URL` | `https://api.childsafe.example.com/api` | 백엔드 base URL |

백엔드가 아직 없으므로 기본값은 목 데이터입니다.

---

## 폴더 구조

```
src/
├─ app/            # 라우터, 프로바이더, 전역 셸
├─ shared/
│  ├─ api/         # client.ts(axios+봉투 언랩+JWT), mock.ts
│  ├─ ui/          # 공통 컴포넌트 (Button, Table, Modal, ListToolbar, ConfirmModal, ...)
│  ├─ auth/        # AuthContext, ProtectedRoute, useAuth, useRole
│  ├─ hooks/       # useListParams (목록 URL 쿼리)
│  ├─ lib/         # types, 포맷터(date/currency/mask/josa), 상수(nav, roles), audit
│  └─ styles/      # tokens.css (디자인 변수 + 전역)
├─ assets/         # Figma 에서 내보낸 아이콘 · 로고
├─ mocks/          # 도메인별 목 데이터
├─ features/       # auth, dashboard, members, payments, notices,
│                  # inquiries, community, harmful-keywords, audit-logs, admins
└─ main.tsx
```

**규칙**

- feature 끼리 직접 import 하지 않습니다. 공유가 필요하면 `shared/` 를 경유합니다.
- 한 feature 는 `pages/` + `components/` + `api.ts` + `types.ts` 로 구성합니다.
- import 경로는 `@` alias 를 씁니다 (`@/shared/ui`).
- 페이지는 lazy 로드합니다.

---

## 디자인 토큰

색상·간격·서체는 전부 `src/shared/styles/tokens.css` 의 CSS 변수로만 사용합니다.
**컴포넌트 CSS 에서 색상 하드코딩 금지.**

값은 Figma "SK쉴더스 루키즈 H.A.C.K" 파일에서 실측해 옮겼습니다.

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--accent` | `#f58220` | 주 버튼, 강조 |
| `--accent-strong` | `#964900` | 링크, 브랜드 텍스트 |
| `--bg` | `#fff8f5` | 페이지·사이드바 배경 |
| `--surface` | `#ffffff` | 카드·모달 |
| `--text-strong` / `--text` | `#241913` / `#564336` | 제목 / 본문 |
| `--border` | `#ddc1b0` | 테두리 |

서체는 Noto Sans KR (Google Fonts), 폴백 `system-ui`.

라이트/다크 모두 지원합니다. **상단바 프로필 메뉴 → "화면 테마"** 에서 라이트 / 다크 / 시스템 설정을 고를 수 있고,
선택값은 `localStorage`의 `careguard.theme` 에 저장됩니다. 아무것도 고르지 않으면 OS 설정(`prefers-color-scheme`)을 따릅니다.

색감·간격·컴포넌트 스펙을 정리한 스타일 레퍼런스는 [`docs/FIGMA-STYLE.md`](docs/FIGMA-STYLE.md) 에 있습니다.

공통 컴포넌트가 실제로 어떻게 보이는지는 개발 서버에서 **`/ui-kit`** 경로로 확인할 수 있습니다.

---

## Git 브랜치 전략

```
main  ←(PR)―  dev  ←(PR)―  dev-minwook   (엄민욱)
                     ←(PR)―  dev-jooyoung  (이주영)
```

| 브랜치 | 용도 |
| --- | --- |
| `main` | 배포/안정 브랜치. **직접 커밋 금지.** `dev` 에서 PR 로만 머지 |
| `dev` | 웹 통합 브랜치. `main` 에서 분기 |
| `dev-minwook` | 엄민욱 개인 작업 브랜치. `dev` 에서 분기 |
| `dev-jooyoung` | 이주영 개인 작업 브랜치. `dev` 에서 분기 |

**협업 흐름**

1. 개인 브랜치에서 작업하고 화면 단위로 커밋합니다.
2. 개인 브랜치 → `dev` PR (리뷰어 1명 이상).
3. 마일스톤마다 `dev` → `main` PR.

**커밋 메시지**

`feat:` / `fix:` / `style:` / `refactor:` 프리픽스를 붙입니다. 설명은 한글로 써도 됩니다.

```
feat: 회원 관리 목록·검색·페이징 구현
fix: 결제 상세 슬라이드오버 ESC 미동작 수정
```

> `shared/ui` 의 공통 컴포넌트를 고칠 때는 다른 화면에 영향이 가므로 상대에게 공지합니다.

**원격 저장소**

이미 `origin` 이 연결되어 있습니다.

```bash
git remote -v
```

새로 클론한 뒤 개인 브랜치를 만들려면:

```bash
git checkout dev && git pull && git checkout -b dev-<이름>
```

---

## 컨벤션

- 컴포넌트 `PascalCase`, 훅 `useXxx`, 폴더 `kebab-case`
- 서버 상태는 TanStack Query. 쿼리 키는 `["members", params]`, `["member", id]` 형태
- 목록 페이징은 `page`(0-base) / `size` / `totalPages` — API 명세 3.5 규약과 동일
- 목록의 검색어·필터·페이지는 **URL 쿼리**로 관리합니다. `setSearchParams` 를 직접 다루지 말고
  `shared/hooks/useListParams` 를 쓰세요 (화면마다 복사되며 빈 값 처리 규칙이 갈렸던 적이 있습니다)
- 개인정보는 반드시 `shared/lib/format.ts` 의 마스킹 유틸(`maskName` `maskEmail` `maskPhone` …)을
  거쳐 표시합니다. 화면에서 직접 문자열을 자르지 않습니다
- 명세에 없는 API 를 쓰거나 명세와 다르게 호출할 때는 `// TODO(api):` 주석으로 남깁니다

### 화면 완료 기준 (DoD)

- 목록 / 상세 / 빈 / 로딩 / 에러 상태가 모두 렌더된다
- 역할별 노출·차단이 동작한다
- 페이징·검색 파라미터가 일관된다
- 디자인 토큰만 사용한다 (색상 하드코딩 없음)
- 키보드 포커스가 보인다
- 1440×1024 레이아웃이 깨지지 않는다
- 콘솔 에러 0

---

## 권한

역할은 `GET /admin/admins` 응답의 `role` 값 4가지입니다 (명세 5.1).

`SUPER_ADMIN` · `GENERAL_ADMIN` · `COMMUNITY_ADMIN` · `INQUIRY_ADMIN`

아래는 **API 명세 5장의 엔드포인트별 요구 권한을 그대로 옮긴 것**입니다.
역할표를 먼저 정하고 화면을 맞추는 게 아니라, 엔드포인트가 기준입니다.

| 기능 | 명세 | 허용 역할 |
| --- | --- | --- |
| 회원 목록·상세·기기 조회 | 5.2 | `SUPER_ADMIN`, `GENERAL_ADMIN` |
| 회원 수정·삭제 | 5.2 | `SUPER_ADMIN` |
| 공지 목록·상세 | 5.3 | 인증만 되면 가능 (역할 제한 없음) |
| 공지 작성·수정·삭제, 전체 알림 발송 | 5.3 | `SUPER_ADMIN` |
| 1:1 문의 조회·답변 등록/수정/삭제 | 5.4 | `SUPER_ADMIN`, `INQUIRY_ADMIN` |
| 커뮤니티 게시글 **목록** | 5.5 | `SUPER_ADMIN`, `GENERAL_ADMIN`, `COMMUNITY_ADMIN` |
| 커뮤니티 게시글 **상세·삭제**, 사용자 밴 | 5.5 | `SUPER_ADMIN`, `COMMUNITY_ADMIN` (아래 참고) |
| 커뮤니티 신고 조회 | 5.5 | `SUPER_ADMIN` |
| 유해 키워드 목록·추가·삭제 | 5.6 | `SUPER_ADMIN` |
| 리포트 CSV (회원) | 5.7 | `SUPER_ADMIN` |
| 리포트 CSV (문의) | 5.7 | `SUPER_ADMIN`, `INQUIRY_ADMIN` |
| 감사 로그 조회 | 5.8 | `SUPER_ADMIN` |
| 충전·결제·지갑·통계 조회 | 5.9 | `SUPER_ADMIN`, `GENERAL_ADMIN` |
| 강제 환불·충전 취소, 지갑 잔액 조정 | 5.9 | `SUPER_ADMIN` |
| 관리자 계정 목록·권한 변경 | 5.1 | `SUPER_ADMIN` |

권한이 없는 메뉴·버튼은 화면에서 **숨깁니다** (`disabled` 가 아니라 렌더하지 않음).

> ⚠️ **프론트엔드의 권한 검사는 UX 용입니다.** 실제 접근 통제는 서버(Spring Security)가 담당합니다.
> 프론트 가드를 믿고 서버 권한 검사를 생략하면 안 됩니다.

### 명세에서 확인이 필요한 부분

- **커뮤니티 상세 조회·사용자 밴 — 코드가 문서보다 좁습니다.** 명세의
  `GET /admin/community/posts/{id}` 와 `POST /admin/community/members/ban` 에는
  `GENERAL_ADMIN` 이 적혀 있지만 코드는 `SUPER_ADMIN` · `COMMUNITY_ADMIN` 만 허용합니다
  (`CommunityPage` 의 `canModerate`). 같은 자리에 있던 `DELETE /admin/community/posts/{id}`
  의 `GENERAL_ADMIN` 은 백엔드가 **잘못 들어간 것**이라고 확인해 문서에서 뺐는데,
  나머지 둘도 같은 오기인지는 확인받지 못했습니다. **문서만 보고 넓히지 마세요.**

### 감사 로그

관리자 활동은 서버가 자동으로 기록합니다(명세 5.8, 별도 생성 API 없음). 프론트는 조회만 합니다.

목 모드에서는 각 `api.ts` 가 `appendAuditLog` 로 같은 기록을 흉내 냅니다 — 서버 연동 후에는
그 블록을 지웁니다. 다만 **캐시 무효화는 두 모드 모두 필요합니다.** 감사 대상 활동을 끝낸
뮤테이션의 `onSuccess` 에서 `useAuditLogSync()` 를 반드시 호출하세요. 빠뜨리면 `staleTime`
(30초) 안에 감사 로그 화면을 열었을 때 방금 한 작업이 빠진 채로 캐시가 그대로 나옵니다.
