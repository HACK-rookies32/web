# Figma 스타일 · 레이아웃 레퍼런스 — 케어가드 어드민

> 파일: **SK쉴더스 루키즈 H.A.C.K.** — `YdID3StD0BGknABkdfYSYx`
> https://www.figma.com/design/YdID3StD0BGknABkdfYSYx/SK%EC%89%B4%EB%8D%94%EC%8A%A4-%EB%A3%A8%ED%82%A4%EC%A6%88-H.A.C.K.?node-id=0-1
> 최종 갱신: 2026-08-25

새 화면을 만들 때 이 문서를 먼저 본다. **값은 전부 `src/shared/styles/tokens.css` 의 CSS 변수로만 쓴다. 색상 하드코딩 금지.**

---

## 0. 이 문서의 근거와 확인 상태

| 구분 | 상태 |
| --- | --- |
| Figma MCP (`get_metadata` / `get_variable_defs` / `get_design_context`) | ❌ **Starter 플랜 호출 한도 소진** — `rate-limits-access` 에러 |
| Claude in Chrome (실제 로그인 세션) | ❌ 연결된 브라우저 없음 |
| 인앱 브라우저로 파일 열기 | ⚠️ 파일 자체는 **익명 열람으로 열림**. 단 로그인이 안 돼 **Dev Mode·인스펙트 불가**, 레이어 패널도 안 보임. 캔버스는 WebGL이라 DOM으로 값을 읽을 수 없고, 브라우저 패널이 표시되지 않아 스크린샷도 실패 |

따라서 **이 문서의 수치는 새로 측정한 값이 아니라**, 앞선 세션에서 Figma MCP로 실측해 `tokens.css` 에 옮겨 둔 값과 그것을 적용한 실제 구현 CSS를 대조·정리한 것이다. 각 항목의 출처를 아래처럼 표기한다.

- 🎯 **Figma 실측** — `tokens.css` 주석에 추출 노드가 명시된 값
- 🧩 **구현 확정** — 실측 토큰을 조합해 코드로 굳힌 값 (Figma 원본 재확인 불필요)
- ❓ **미확인** — Figma 원본과 대조하지 못한 값. 한도가 풀리면 검증할 것

**추출된 Figma 노드** (tokens.css 헤더 기준): 로그인 `131:1957`, 로그인 버튼 `131:1991`, Aside `131:3798`, Header `131:3771`, 테이블 상태 Pill `131:3607~3657`

---

## 1. 색감 — 웜 크림 + 오렌지

전체 인상은 **차가운 회색을 한 톤도 쓰지 않는 웜(warm) 팔레트**다. 배경은 흰색이 아니라 크림(`#fff8f5`), 텍스트는 검정이 아니라 웜 브라운(`#241913` / `#564336`), 테두리도 회색이 아니라 살구빛(`#ddc1b0`). 여기에 SK쉴더스 오렌지(`#f58220`)를 강조색으로 얹는다.

### 1.1 브랜드 / 강조 🎯

| 토큰 | 값 | 쓰는 곳 |
| --- | --- | --- |
| `--accent` | `#f58220` | 주 버튼 배경, 상단 강조선, 포커스 링 |
| `--accent-hover` | `#d96d12` | 주 버튼 hover |
| `--accent-active-bg` | `#fe8931` | **사이드바 활성 메뉴 배경** |
| `--accent-active-fg` | `#652e00` | 사이드바 활성 메뉴 글자 |
| `--accent-strong` | `#964900` | 링크, 브랜드 텍스트, 아바타 배경, breadcrumb |
| `--accent-on-fill` | `#5b2a00` | accent 배경 위 글자(페이지네이션 활성) |

> 활성 메뉴 글자를 흰색이 아니라 **진한 갈색(`#652e00`)** 으로 쓰는 게 이 디자인의 특징이다. 오렌지 위에 흰 글자를 얹지 않는다.

### 1.2 배경 / 표면 🎯

| 토큰 | 값 | 쓰는 곳 |
| --- | --- | --- |
| `--bg` | `#fff8f5` | 페이지 · **사이드바** · 입력 배경 |
| `--bg-header` | `rgba(255,248,245,.9)` | 상단바 (backdrop-blur 6px 동반) |
| `--surface` | `#ffffff` | 카드 · 테이블 · 모달 |
| `--surface-subtle` | `#fff1ea` | 테이블 헤더, 상단바 검색창, hover 행 |
| `--surface-tint` | `#ffeade` | 강조 배경(배지, 안내 박스), 메뉴 hover |
| `--surface-tint-strong` | `#ffdcc6` | 역할 배지 배경, `::selection` |

> **사이드바는 카드가 아니라 페이지와 같은 배경(`--bg`)** 이다. 경계는 테두리가 아니라 `drop-shadow` 로만 만든다. 흰 표면은 카드·표·모달에만 쓴다 — 이게 화면의 계층을 만든다.

### 1.3 텍스트 / 선 🎯

| 토큰 | 값 | 쓰는 곳 |
| --- | --- | --- |
| `--text-strong` | `#241913` | 제목, 표의 1차 값 |
| `--text` | `#564336` | 기본 본문 |
| `--text-muted` | `rgba(86,67,54,.7)` | 보조 설명, 카드 설명 |
| `--text-placeholder` | `#9ca3af` | 입력 placeholder (팔레트 중 유일한 중성 회색) |
| `--text-on-accent` | `#ffffff` | accent 배경 위 글자 |
| `--border` | `#ddc1b0` | 입력·버튼 테두리, 구분선 |
| `--border-subtle` | `rgba(221,193,176,.3)` | 표 행 구분선, 메뉴 테두리 |

### 1.4 상태색 (fg/bg 쌍) 🎯 — Pill `131:3607~3657`

| 톤 | 글자 | 배경 | 의미 |
| --- | --- | --- | --- |
| success | `#137333` | `#e6f4ea` | 활성 · 정상 · 답변완료 |
| warning | `#a15c07` | `#fdecd3` | 대기 · 처리중 |
| danger | `#ba1a1a` | `#ffdad6` | 정지 · 실패 · 알림 뱃지 |
| info | `#1a56db` | `#e3ecfd` | 정보 |
| neutral | `#564336` | `#f9e4d9` | 기본 · 해지 |
| accent | `#964900` | `#fff0e5` | 강조 태그 |

**상태색은 반드시 쌍으로 쓴다.** 글자색만 바꾸고 배경을 비우거나 그 반대로 하지 않는다.

### 1.5 다크 모드 🧩

`:root[data-theme='dark']` 와 `@media (prefers-color-scheme: dark)` 양쪽에 같은 값을 정의한다. 웜 팔레트를 그대로 어둡게 뒤집되 **accent 계열은 채도를 유지**한다: `--bg: #1a120d`, `--surface: #241913`(라이트의 `--text-strong` 과 같은 값), `--text-strong: #fff8f5`(라이트의 `--bg`). 상태색만 밝은 톤(`#4ade80`, `#f87171` …)으로 교체한다.

새 컴포넌트를 만들 때 **다크용 CSS를 따로 쓸 일이 없어야 한다.** 토큰만 쓰면 자동으로 따라온다.

**전환 방법** — 상단바 프로필 메뉴의 "화면 테마"에서 **라이트 / 다크 / 시스템 설정** 3단으로 고른다.

| `<html>` 상태 | 결과 |
| --- | --- |
| 속성 없음 | OS 설정을 따름 (`prefers-color-scheme`) — 기본값 |
| `data-theme="dark"` | 무조건 다크 |
| `data-theme="light"` | OS 가 다크여도 라이트 고정 |

선택값은 `localStorage`의 `careguard.theme`(= `constants.ts` 의 `THEME_STORAGE_KEY`)에 저장된다. `시스템 설정`은 값을 저장하는 대신 **키를 지운다** — 저장돼 있지 않은 상태가 곧 "OS 따름"이다. 첫 페인트 전 적용은 `index.html` 의 인라인 스크립트가 하므로 다크 사용자에게 흰 화면이 번쩍이지 않는다. 로직은 [`shared/lib/theme.ts`](../src/shared/lib/theme.ts), UI 는 [`app/layout/ThemeSwitch.tsx`](../src/app/layout/ThemeSwitch.tsx).

> ⚠️ `index.html` 의 인라인 스크립트는 순수 JS라 상수를 import 할 수 없어 `'careguard.theme'` 문자열이 중복돼 있다. 키를 바꾸면 **두 곳을 같이** 고쳐야 한다.

---

## 2. 타이포 🎯

**Noto Sans KR** (Google Fonts, weight 400/500/700), 폴백 `system-ui`.

| 토큰 | size / line-height | 쓰는 곳 |
| --- | --- | --- |
| `--fs-display` | 24 / 32 | 로그인 타이틀 |
| `--fs-title` | 20 / 28 | 상단바 페이지 제목 |
| `--fs-heading` | 18 / 26 | 카드 제목 |
| `--fs-body` | 14 / 20 | 기본 본문, 표 본문, 사이드바 메뉴 |
| `--fs-label` | 13 / 18 | 라벨, 버튼, 표 헤더, breadcrumb |
| `--fs-caption` | 12 / 16 | 캡션, 2차 값, sm 버튼 |
| `--fs-badge` | 11 / 16.5 | 역할 배지 |

예외 🧩: **페이지 제목(`PageHeader`)만 28/38, `letter-spacing: -0.24px`** 로 토큰 밖의 값을 쓴다. 본문 최상단 제목이라 상단바 제목(20px)과 구분이 필요해서다.

weight 규칙: 제목·버튼 **700**, 표 헤더·활성 메뉴·표 1차 값 **500**, 나머지 **400**.

숫자 칸에는 `.tabular` 클래스(= `font-variant-numeric: tabular-nums`)를 붙여 자릿수가 흔들리지 않게 한다.

---

## 3. 간격 · 반경 · 그림자

### 3.1 간격 — 8pt 그리드 🎯

`--space-1` 4 / `--space-2` 8 / `--space-3` 12 / `--space-4` 16 / `--space-5` 24 / `--space-6` 32 / `--space-7` 48

가장 많이 쓰는 조합 🧩:
- 페이지 본문 패딩 · 섹션 사이 간격: `--space-5` (24px)
- 카드 안쪽 패딩: `--space-5`, 헤더 다음 본문만 위쪽 `--space-4`(= Figma 간격 20px에 맞춘 보정)
- 표 셀 패딩: `12px 16px`
- 버튼 안 아이콘–글자 간격, 인접 버튼 간격: `--space-2`

### 3.2 반경 🎯

`--radius-sm` **4px**(역할 배지·태그) / `--radius` **8px**(입력·버튼·메뉴) / `--radius-lg` **12px**(카드·모달) / `--radius-pill` **9999px**(Pill·아바타·아이콘 버튼)

### 3.3 그림자 🎯

| 토큰 | 값 | 쓰는 곳 |
| --- | --- | --- |
| `--shadow-xs` | `0 1px 1px rgba(0,0,0,.05)` | 주 버튼 |
| `--shadow-sm` | `0 1px 4px rgba(0,0,0,.05)` | 상단바 |
| `--shadow-card` | `0 1px 3px rgba(0,0,0,.06), 0 1px 2px -1px rgba(0,0,0,.06)` | 카드 |
| `--shadow-lg` | `0 10px 15px -3px …, 0 4px 6px -4px …` | 모달·드롭다운 |
| `--shadow-aside` | `4px 0 6px rgba(0,0,0,.03)` | 사이드바 (`filter: drop-shadow`) |

**카드는 테두리가 아니라 그림자로 띄운다.** `border: 1px solid var(--border)` 를 카드에 두르지 않는다.

---

## 4. 레이아웃 골격 🧩

기준 폭 1280, 콘텐츠 최대 1440, 사이드바 256px.

```
┌────────────┬──────────────────────────────────────┐
│  Sidebar   │  Topbar   (sticky, h=64, blur)       │  ← grid-template-areas
│  256px     ├──────────────────────────────────────┤     'aside header'
│  (sticky,  │  main                                │     'aside main'
│   h=100vh) │   └ content (max 1440, 중앙, p=24,   │
│            │      섹션 간 gap 24)                  │
└────────────┴──────────────────────────────────────┘
```

```css
.app-layout {
  display: grid;
  grid-template-areas: 'aside header' 'aside main';
  grid-template-columns: var(--aside-width) minmax(0, 1fr);
  grid-template-rows: var(--header-height) minmax(0, 1fr);
}
```

| 토큰 | 값 |
| --- | --- |
| `--aside-width` | 256px (접힘 상태 **72px**) |
| `--header-height` | 64px |
| `--content-max` | 1440px |

**가로 스크롤 규칙 (DoD)**: `.app-layout__main { min-width: 0; overflow-x: hidden }` + 그리드 컬럼에 `minmax(0, 1fr)`. 넓은 표는 `.table-scroll { overflow: auto }` 안에서만 밀린다. **페이지 본문은 절대 가로로 밀리지 않는다.**

### 4.1 사이드바

- 배경 `--bg`(페이지와 동일), 경계는 `drop-shadow(--shadow-aside)` 뿐
- 브랜드 영역 높이 = `--header-height`, 아래에 `1px solid var(--border)` 한 줄
- 메뉴: 패딩 `8px 16px`, radius 8, 항목 간 gap 4, 아이콘–라벨 gap 16
- hover = `--surface-tint` 배경 + `--accent-strong` 글자 / active = `--accent-active-bg` 배경 + `--accent-active-fg` 글자 + weight 500
- 접히면 라벨을 `display:none` 하고 아이콘만 가운데 정렬

### 4.2 상단바

- `position: sticky`, `--bg-header`(90% 불투명) + `backdrop-filter: blur(6px)` + `--shadow-sm`
- 좌: 햄버거 + 페이지 제목(20/28, 넘치면 ellipsis) / 우: 검색 320px · 알림 아이콘 · 프로필
- 아이콘 버튼 32×32 원형, hover 시 `--surface-tint`
- 알림 점 8×8 원, `--danger`, 배경색과 같은 2px 테두리로 파냄
- 프로필: 왼쪽에 `1px solid var(--border)` 구분선, 아바타 36×36 원형 `--accent-strong`, 이름 아래 역할 배지(11px, `--surface-tint-strong`)

---

## 5. 컴포넌트 스펙 🧩

### Button
높이 **sm 32 / md 38 / lg 48**(lg = Figma 로그인 버튼 `131:1991` 🎯), radius 8, weight 700, `inline-flex` + gap 8.
변형 6종: `primary`(accent 배경·흰 글자·shadow-xs) · `secondary`(흰 배경·border, hover 시 테두리와 글자가 accent로) · `dark`(`--accent-strong` 배경) · `ghost` · `danger` · `icon-only`(정사각 32, sm은 28).

### Card
흰 표면 + radius 12 + `--shadow-card` + `overflow: hidden`. 헤더는 `24px 24px 0`, 본문 24(헤더가 있으면 위쪽만 16). 표를 담을 때는 `card__body--flush`(패딩 0).

### Table
- 헤더: `sticky top:0`, 배경 `--surface-subtle`, 13px/weight 500, 아래 `--border-subtle` 1px
- 행: 아래 `--border-subtle` 1px, hover 시 `--surface-subtle`
- 셀: 패딩 `12px 16px`, 14px
- **2단 셀**(`.cell-stack`): 1차 값 14px/500/`--text-strong` + 2차 값 12px/`--text`
- **액션 칸은 평소 `opacity:0`, 행 hover·focus-within 시 나타난다** 🎯 — Figma 패턴
- 확장 행 배경 `--surface-subtle`, 하단 페이지네이션 영역은 `--bg` + 위쪽 구분선
- 로딩·에러·빈 상태를 표 내부에서 처리한다 (바깥에서 분기하지 않는다)

### StatusPill
패딩 `2px 8px`, 12px/line-height 20/weight 500. 모양 2종: `tag`(radius 4) · `pill`(radius 9999, 좌우 패딩 12). 톤은 §1.4의 6종.

### PageHeader
세로 스택 gap 8 → breadcrumb(13px, `--accent-strong`) / 제목행(28/38, `-0.24px`) + 우측 액션 / 설명(14px, `--text-muted`).

### 오버레이
모달 스크림 `--scrim`, 슬라이드오버 스크림 `--scrim-soft` — 검정이 아니라 **`--text-strong` 을 풀어 쓴 웜 브라운**(`rgba(36,25,19,…)`)이다. 라이트·다크 동일 값.

### ⚠️ Select 을 페이지에서 덮을 때

`.control--select` 는 화살표를 `background-image: var(--select-arrow)` 로 그린다. 페이지 CSS에서 배경색을 덮을 때 **단축 속성 `background` 를 쓰면 화살표가 함께 지워진다.** 반드시 `background-color` 를 쓸 것.

```css
/* ✗ 화살표가 사라진다 */
.foo__filter { background: var(--surface); }
/* ✓ */
.foo__filter { background-color: var(--surface); }
```

실제로 회원 관리 화면에서 이 실수로 화살표가 사라져 있었다(2026-08-25 수정).

---

## 6. 화면 조립 패턴 (목록형)

남은 화면(커뮤니티 · 유해사이트 · 감사 로그 · 관리자 계정)도 이 순서를 따른다.

```
PageHeader (제목 + 설명 + 우측 액션 버튼)
└ Card
   ├ card__header : 좌측 SearchInput·Select 필터 / 우측 건수·보조 액션
   └ card__body--flush
      └ Table (헤더 sticky · 행 hover 액션 · 로딩/에러/빈 상태 내장)
         └ table-wrap__footer : Pagination
```

- 검색어·필터·페이지는 **URL 쿼리**로 관리한다 (새로고침·링크 공유·뒤로 가기가 동작해야 함)
- 상세는 **행 확장** 또는 **SlideOver**, 편집·삭제는 **Modal**
- 권한 없는 액션 버튼은 `disabled` 가 아니라 **렌더하지 않는다**

---

## 7. 접근성 · 모션 🧩

- 포커스: `:focus-visible` 에만 `--focus-ring`(= `0 0 0 3px rgba(245,130,32,.35)`). 표 행은 `inset` 으로 넣는다
- 전환: `--transition` = `140ms ease`. 색·배경·폭에만 건다
- `prefers-reduced-motion: reduce` 에서 모든 애니메이션·트랜지션을 0.01ms로 무력화 (전역 처리 완료)
- 스크롤바도 웜 팔레트(`--border`)로 맞춰 둠

---

## 8. 처리 현황

### ✅ 2026-08-25 처리 완료

1. **Select 화살표 다크 모드 결함** — `--select-arrow` 토큰을 신설해 라이트(`#564336`)·다크(`#e4d3c7`) SVG를 테마별로 교체. 다크 대비 **1.9:1 → 11.9:1**. data URI 안에서는 `currentColor` 가 해석되지 않으므로 토큰 분기가 유일한 CSS-only 해법이다.
2. **🆕 회원 관리 화면 Select 화살표 실종** — 검증 중 발견한 별개 버그. `MembersPage.css` 가 단축 속성 `background: var(--surface)` 로 배경을 덮어 `background-image`(화살표)까지 지우고 있었다. `background-color` 로 수정. (§5 "Select 을 페이지에서 덮을 때" 참고)
3. **하드코딩 색 6곳 토큰화** — `--scrim` / `--scrim-soft` / `--accent-wash` / `--accent-wash-strong` / `--text-on-solid` 신설.
   - 스크림·블롭은 라이트·다크 동일 값이라 **시각 변화 없음**
   - `--text-on-solid` 만 다크에서 `#241913` 로 분기 → danger 버튼(2.8:1 → 6.2:1)과 활동 로그 info 아이콘(2.5:1 → 6.8:1)의 **다크 모드 대비가 개선됨(의도한 변화)**
4. **대형 수치 토큰화** — `--fs-metric`(30/38) · `--fs-page-title`(28/38) · `--tracking-metric`(-0.4px) · `--tracking-title`(-0.24px) 신설. 혼자 26/34였던 자금 화면 KPI를 **30/38로 통일**(의도한 시각 변화).
5. **긴 본문 `--lh-body-long`(22px) 신설** — 공지·문의 본문 2곳 적용.
6. **배지 line-height 통일** — `.notices__chip` 18px → `--lh-badge`(16.5).

검증: 개발 서버에서 라이트·다크 각각 계산된 스타일 값을 직접 읽어 확인. 회원·공지·문의·자금 4개 화면 Select 화살표, KPI·페이지 제목 크기, 스크림, danger 버튼, info 아이콘 전부 확인. 콘솔 에러 0, 1280px에서 가로 밀림 없음. `npm run build` 통과.

### 남은 일

7. **툴바 블록 4중 복제** — `members__toolbar` / `notices__toolbar` / `inquiries__toolbar` / `funds__toolbar` 가 사실상 동일하다(검색 `flex: 1 1 320px; max-width: 420px`, select `width:auto; padding-block: 8px; background: surface`). 값이 두 군데서 갈린다:
   - select `min-width`: 회원·공지·문의 **148px** vs 자금 **160px**
   - 필터 묶음 `gap`: 회원·공지 **8px** vs 문의 **12px**
   → `shared/ui` 에 `ListToolbar` 를 만들어 흡수하는 게 맞다
8. **KPI 카드가 두 벌** — `KpiCard.css`(대시보드, 패딩 `16 24 24`)와 `PaymentsPage.css .funds__kpi`(자금, 패딩 `16 24`). 값 크기는 통일했지만 카드 자체는 여전히 자금 화면이 별도 구현이다
9. **`quickview__cta` 가 Button 을 손으로 복제** — `MemberQuickView.css:118` 이 `.btn--primary.btn--md`(height 38 · accent · shadow-xs · weight 700)를 그대로 다시 그렸다. `<a>` 라서 Button 컴포넌트를 못 쓴 것으로 보인다. → Button 에 `as="a"` / `href` 지원을 넣는 편이 낫다
10. **`Glyphs.tsx:37` 인라인 `transition: 'transform 140ms ease'`** — `var(--transition)` 로 교체
11. **다크 모드 스크림 세기 재검토** — `--scrim` 은 라이트·다크 동일 값(`rgba(36,25,19,.45)`)이다. 어두운 배경 위에서는 거의 어둡게 만들지 못하므로 다크 전용 값을 줄지 판단 필요
12. **의도 확인 필요한 토큰 밖 값 2건** — `LoginPage.css:108` `.login__input { font-size: 16px }`(본문 14px과 다름), `StatusPill.css:7` `line-height: 20px`. 둘 다 Figma 실측일 가능성이 있어 이번에 손대지 않았다
13. **직접 그린 아이콘을 Figma 원본으로 교체** — `features/dashboard/components/KpiCard.tsx`, `features/members/components/Glyphs.tsx`
14. **❓ 미확인 값 검증** — PageHeader 28/38, 카드 헤더–본문 간격 보정, 사이드바 접힘 폭 72px, 상단바 검색 320px
15. `get_variable_defs` 로 **Figma 변수(Variables) 정의 자체를 확인** — 지금 토큰은 노드 실측값이라, Figma 쪽에 변수가 정의돼 있다면 이름을 맞추는 게 좋다

---

## 9. 자가 점검

```bash
grep -rnE "(color|background|background-color|border-color|background-image):.*(#[0-9a-fA-F]{3,8}|%23|rgba?\()" --include=*.css src | grep -v "styles/tokens.css"
```

**현재 기준값은 0건이다.** 새 화면을 올릴 때 여기서 늘어나면 안 된다. `%23` 은 data URI 안에 URL 인코딩된 hex를 잡기 위한 것이다(실제로 이 방식으로 숨어 있던 결함을 찾았다).

```bash
grep -rnE "font-size:\s*[0-9]|line-height:\s*[0-9]|letter-spacing:\s*-?[0-9]" --include=*.css src | grep -v "styles/tokens.css"
```

타이포 기준값은 **2건**(§8-12의 `LoginPage.css:108`, `StatusPill.css:7`)이다.

공통 컴포넌트를 고쳤다면 개발 서버 `/ui-kit` 에서 회귀를 눈으로 본다. 다크 모드는 브라우저 콘솔에서 `document.documentElement.setAttribute('data-theme','dark')` 로 바로 전환해 확인할 수 있다.
