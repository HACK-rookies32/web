import type { IconName } from '@/shared/ui';
import type { Role } from './types';

/* --------------------------------------------------------------- 역할 ---- */

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: '슈퍼 관리자',
  GENERAL_ADMIN: '일반 관리자',
  COMMUNITY_ADMIN: '커뮤니티 관리자',
  INQUIRY_ADMIN: '문의 관리자',
};

/** 관리자 계정 관리 화면의 역할 선택지. */
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
 * 1:1 문의는 명세 5.4 기준 SUPER_ADMIN · INQUIRY_ADMIN 만 접근할 수 있다
 * (GENERAL_ADMIN 은 403).
 */
/** 메뉴 아이콘 이름 → 실제 아이콘 자산. 사이드바와 홈 화면이 함께 쓴다. */
export const NAV_ICON: Record<NavIconName, IconName> = {
  dashboard: 'nav-dashboard',
  members: 'nav-members',
  payments: 'nav-payments',
  notices: 'nav-notices',
  inquiries: 'nav-inquiries',
  community: 'nav-community',
  harmful: 'nav-harmful',
  audit: 'nav-audit',
  admins: 'nav-admins',
};

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: '홈 화면', icon: 'dashboard' },
  { to: '/members', label: '회원 관리', icon: 'members', roles: ['SUPER_ADMIN'] },
  { to: '/payments', label: '자금·결제 관리', icon: 'payments', roles: ['SUPER_ADMIN'] },
  {
    to: '/notices',
    label: '공지 관리',
    icon: 'notices',
    /* 공지는 관리자 4종 전체 조회·관리 허용(백엔드 권한표 반영). */
    roles: ['SUPER_ADMIN', 'GENERAL_ADMIN', 'COMMUNITY_ADMIN', 'INQUIRY_ADMIN'],
  },
  {
    to: '/inquiries',
    label: '1:1 문의',
    icon: 'inquiries',
    roles: ['SUPER_ADMIN', 'INQUIRY_ADMIN'],
  },
  {
    to: '/community',
    label: '커뮤니티 관리',
    icon: 'community',
    /* 커뮤니티는 SUPER·COMMUNITY 만 허용(백엔드가 GENERAL_ADMIN 은 403 으로 차단). */
    roles: ['SUPER_ADMIN', 'COMMUNITY_ADMIN'],
  },
  {
    to: '/harmful-keywords',
    label: '유해사이트 관리',
    icon: 'harmful',
    /* 유해사이트도 관리자 4종 전체 허용(백엔드 권한표 반영). */
    roles: ['SUPER_ADMIN', 'GENERAL_ADMIN', 'COMMUNITY_ADMIN', 'INQUIRY_ADMIN'],
  },
  { to: '/audit-logs', label: '감사 로그', icon: 'audit', roles: ['SUPER_ADMIN'] },
  { to: '/admins', label: '관리자 계정 관리', icon: 'admins', roles: ['SUPER_ADMIN'] },
];

/* ----------------------------------------------------------- 페이징 ---- */

/** 명세 3.5 의 기본값은 20 이나, 화면 밀도상 목록은 10건으로 끊는다. */
export const DEFAULT_PAGE_SIZE = 10;

/** 목록에서 고를 수 있는 페이지당 표시 건수. */
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

/* ------------------------------------------------------------- 저장소 ---- */

export const AUTH_STORAGE_KEY = 'careguard.auth';
export const THEME_STORAGE_KEY = 'careguard.theme';
