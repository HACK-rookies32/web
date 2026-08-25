import { Card, EmptyState, StatusPill } from '@/shared/ui';

interface PlaceholderPageProps {
  title: string;
  /** 이 화면이 사용할 예정인 API 경로 */
  endpoints: string[];
}

/**
 * 아직 구현하지 않은 화면의 자리표시.
 * 사이드바 9개 메뉴가 전부 라우팅으로 연결되어야 하므로, 미구현 화면도
 * 빈 페이지 대신 어떤 API 를 쓸 예정인지 보여준다.
 */
export function PlaceholderPage({ title, endpoints }: PlaceholderPageProps) {
  return (
    <Card title={title} action={<StatusPill tone="warning">구현 예정</StatusPill>}>
      <EmptyState
        title="아직 준비 중인 화면입니다"
        description="다음 단계에서 구현합니다. 연동 예정 API 는 아래와 같습니다."
      />
      <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', margin: 0, padding: 0, listStyle: 'none' }}>
        {endpoints.map((e) => (
          <li
            key={e}
            style={{
              padding: 'var(--space-2) var(--space-3)',
              background: 'var(--surface-subtle)',
              borderRadius: 'var(--radius)',
              fontSize: 'var(--fs-label)',
              color: 'var(--text)',
            }}
          >
            {e}
          </li>
        ))}
      </ul>
    </Card>
  );
}
