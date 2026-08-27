import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, EmptyState } from '@/shared/ui';

interface Props {
  children: ReactNode;
  /** 경로가 바뀌면 에러 상태를 초기화하기 위한 키 */
  resetKey: string;
}

interface State {
  error: Error | null;
}

/**
 * 라우트 렌더링 중 발생한 에러를 잡아 화면 전체가 흰 화면이 되는 것을 막는다.
 *
 * 특히 페이지를 lazy 로드하므로, 배포 직후 열려 있던 세션에서는 예전 청크가
 * 404 가 되어 "Failed to fetch dynamically imported module" 이 발생할 수 있다.
 * 이 경우에는 새로고침이 곧 해결책이므로 안내와 함께 새로고침 버튼을 준다.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    // 다른 화면으로 이동하면 에러 상태를 푼다.
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 실제 서비스에서는 여기서 에러 리포팅으로 보낸다.
    console.error('[route error]', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const isChunkError = /dynamically imported module|Loading chunk/i.test(error.message);

    return (
      <EmptyState
        tone="error"
        title={isChunkError ? '화면을 불러오지 못했습니다' : '문제가 발생했습니다'}
        description={
          isChunkError
            ? '새 버전이 배포되어 이전 화면 파일을 찾을 수 없습니다. 새로고침하면 최신 화면으로 이어집니다.'
            : error.message
        }
        action={
          <Button variant="primary" onClick={() => window.location.reload()}>
            새로고침
          </Button>
        }
      />
    );
  }
}
