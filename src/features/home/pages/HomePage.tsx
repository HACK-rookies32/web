import { Link } from 'react-router-dom';
import { Card, Icon } from '@/shared/ui';
import { NAV_ICON, NAV_ITEMS, ROLE_LABEL } from '@/shared/lib/constants';
import { useAuth } from '@/shared/auth/AuthContext';
import './HomePage.css';

/**
 * 홈 화면.
 *
 * 집계 위젯(KPI·가입 추이·최근 활동)을 두던 대시보드였으나, 이를 받쳐 줄
 * 집계 API 가 명세 5장에 없고 대시보드 기능도 쓰지 않기로 확정되어(8/27)
 * 조회 없이 동작하는 이동 화면으로 바꿨다. 서버를 부르지 않는다.
 *
 * 보여 주는 메뉴는 로그인한 계정의 권한으로 걸러진 것이라, 사이드바에
 * 보이는 것과 항상 같다.
 */
export function HomePage() {
  const { session, hasRole } = useAuth();

  /* 홈 자신은 카드로 만들지 않는다. */
  const menus = NAV_ITEMS.filter((item) => item.to !== '/' && hasRole(item.roles));

  return (
    <div className="home">
      <Card className="home__greeting">
        <p className="home__hello">
          <strong>{session?.displayName ?? session?.username ?? '관리자'}</strong>님, 안녕하세요.
        </p>
        <p className="home__role">
          {session ? ROLE_LABEL[session.role] : '관리자'} 권한으로 접속했습니다.
          아래 메뉴에서 관리할 항목을 선택하세요.
        </p>
      </Card>

      <nav className="home__menus" aria-label="관리 메뉴 바로가기">
        {menus.map((item) => (
          <Link key={item.to} to={item.to} className="home__menu">
            <span className="home__menu-icon" aria-hidden="true">
              <Icon name={NAV_ICON[item.icon]} />
            </span>
            <span className="home__menu-label">{item.label}</span>
            <span className="home__menu-arrow" aria-hidden="true">
              <Icon name="arrow-right" />
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
