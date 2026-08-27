import './Icon.css';

/* Figma 에서 내보낸 SVG 원본을 그대로 인라인한다.
   - 지오메트리(viewBox·width·height)는 디자인 그대로 유지한다.
   - fill/stroke 는 currentColor 로 치환해 두었으므로 부모의 color 를 따라간다. */
import navDashboard from '@/assets/icons/nav-dashboard.svg?raw';
import navMembers from '@/assets/icons/nav-members.svg?raw';
import navPayments from '@/assets/icons/nav-payments.svg?raw';
import navNotices from '@/assets/icons/nav-notices.svg?raw';
import navInquiries from '@/assets/icons/nav-inquiries.svg?raw';
import navHarmful from '@/assets/icons/nav-harmful.svg?raw';
import navAudit from '@/assets/icons/nav-audit.svg?raw';
import navAdmins from '@/assets/icons/nav-admins.svg?raw';
import menu from '@/assets/icons/menu.svg?raw';
import search from '@/assets/icons/search.svg?raw';
import bell from '@/assets/icons/bell.svg?raw';
import user from '@/assets/icons/user.svg?raw';
import userLine from '@/assets/icons/user-line.svg?raw';
import lock from '@/assets/icons/lock.svg?raw';
import eye from '@/assets/icons/eye.svg?raw';
import eyeView from '@/assets/icons/eye-view.svg?raw';
import trash from '@/assets/icons/trash.svg?raw';
import arrowRight from '@/assets/icons/arrow-right.svg?raw';
import shield from '@/assets/icons/shield.svg?raw';
import chevronLeft from '@/assets/icons/chevron-left.svg?raw';
import chevronRight from '@/assets/icons/chevron-right.svg?raw';

const ICONS = {
  'nav-dashboard': navDashboard,
  'nav-members': navMembers,
  'nav-payments': navPayments,
  'nav-notices': navNotices,
  'nav-inquiries': navInquiries,
  'nav-community': navInquiries, // Figma 에서 커뮤니티/문의가 동일 글리프를 공유한다
  'nav-harmful': navHarmful,
  'nav-audit': navAudit,
  'nav-admins': navAdmins,
  menu,
  search,
  bell,
  user,
  'user-line': userLine,
  lock,
  eye,
  'eye-view': eyeView,
  trash,
  'arrow-right': arrowRight,
  shield,
  'chevron-left': chevronLeft,
  'chevron-right': chevronRight,
} as const;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  /**
   * 정사각형 글리프를 다른 크기로 쓸 때만 지정한다.
   * 생략하면 Figma 에서 내보낸 원래 치수를 그대로 쓴다(비율 왜곡 방지).
   */
  size?: number;
  className?: string;
}

export function Icon({ name, size, className }: IconProps) {
  const cls = className ? `icon ${className}` : 'icon';
  const style = size ? { width: `${size}px`, height: `${size}px` } : undefined;

  return (
    <span
      className={cls}
      data-sized={size ? '' : undefined}
      style={style}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}
