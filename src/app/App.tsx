import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/shared/auth/AuthContext';
import { ToastProvider } from '@/shared/ui';
import { UiKitPage } from './UiKitPage';

/**
 * 서버 상태 클라이언트.
 * 목 API 는 항상 같은 값을 돌려주므로 staleTime 을 넉넉히 준다.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * 전역 셸.
 *
 * NOTE: 현재는 공통 UI 확인용 /ui-kit 페이지만 연결되어 있다.
 *       다음 단계에서 로그인·대시보드 등 실제 라우트로 교체한다.
 */
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/ui-kit" element={<UiKitPage />} />
              <Route path="*" element={<Navigate to="/ui-kit" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
