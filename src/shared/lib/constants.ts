import type { Role } from './types';

/* --------------------------------------------------------------- 역할 ---- */

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: '슈퍼 관리자',
  GENERAL_ADMIN: '일반 관리자',
  COMMUNITY_ADMIN: '커뮤니티 관리자',
  INQUIRY_ADMIN: '문의 관리자',
};

/** 로그인 화면의 데모용 역할 선택지 (목 로그인 전용). */
export const ROLE_OPTIONS: { value: Role; label: string; hint: string }[] = [
  { value: 'SUPER_ADMIN', label: '슈퍼 관리자', hint: '전체 기능' },
  { value: 'GENERAL_ADMIN', label: '일반 관리자', hint: '회원·결제·문의' },
  { value: 'COMMUNITY_ADMIN', label: '커뮤니티 관리자', hint: '게시글·밴' },
  { value: 'INQUIRY_ADMIN', label: '문의 관리자', hint: '1:1 문의' },
];

/* --------------------------------------------------------- 사이드바 ---- */

export type NavIconName =
  | 'dashboard'
  | 'members'
  | 'payments'
  | 'notices'
  | 'inquiries'
  | 'community'
  | 'harmful'
  | 'audit'
  | 'admins';

export interface NavItem {
  to: string;
  label: string;
  icon: NavIconName;
  /** 접근 가능한 역할. 비어 있으면 인증된 모든 관리자. */
  roles?: Role[];
}

/**
 * 사이드바 9개. 권한은 API 명세 5장의 엔드포인트별 인증 요구사항을 따른다.
 *
 * 핸드오프 문서의 확정 결정에 따라 "리포트" 메뉴는 두지 않는다.
 * (CSV 리포트는 회원 상세의 모달에서 GET /admin/reports/*.csv 를 호출)
 *
 * INQUIRY_ADMIN 은 명세에 접근 범위가 명시되지 않아 "대시보드 + 1:1 문의"로 가정한다.
 */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: '대시보드', icon: 'dashboard' },
  { to: '/members', label: '회원 관리', icon: 'members', roles: ['SUPER_ADMIN', 'GENERAL_ADMIN'] },
  { to: '/payments', label: '자금·결제 관리', icon: 'payments', roles: ['SUPER_ADMIN', 'GENERAL_ADMIN'] },
  { to: '/notices', label: '공지 관리', icon: 'notices', roles: ['SUPER_ADMIN'] },
  {
    to: '/inquiries',
    label: '1:1 문의',
    icon: 'inquiries',
    roles: ['SUPER_ADMIN', 'GENERAL_ADMIN', 'INQUIRY_ADMIN'],
  },
  {
    to: '/community',
    label: '커뮤니티 관리',
    icon: 'community',
    roles: ['SUPER_ADMIN', 'COMMUNITY_ADMIN'],
  },
  { to: '/harmful-keywords', label: '유해사이트 관리', icon: 'harmful', roles: ['SUPER_ADMIN'] },
  { to: '/audit-logs', label: '감사 로그', icon: 'audit', roles: ['SUPER_ADMIN'] },
  { to: '/admins', label: '관리자 계정 관리', icon: 'admins', roles: ['SUPER_ADMIN'] },
];

/* ----------------------------------------------------------- 페이징 ---- */

/** 명세 3.5 의 기본값은 20 이나, 화면 밀도상 목록은 10건으로 끊는다. */
export const DEFAULT_PAGE_SIZE = 10;

/* ------------------------------------------------------------- 저장소 ---- */

export const AUTH_STORAGE_KEY = 'careguard.auth';
export const THEME_STORAGE_KEY = 'careguard.theme';
