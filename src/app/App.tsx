import { lazy } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/shared/auth/AuthContext';
import { ProtectedRoute } from '@/shared/auth/ProtectedRoute';
import { ToastProvider } from '@/shared/ui';
import { AppLayout } from './layout/AppLayout';
import { PlaceholderPage } from './PlaceholderPage';

/* 페이지는 라우트 단위로 lazy 로드한다. */
const LoginPage = lazy(() =>
  import('@/features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const DashboardPage = lazy(() =>
  import('@/features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const UiKitPage = lazy(() => import('./UiKitPage').then((m) => ({ default: m.UiKitPage })));

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
 * 라우트 권한은 API 명세 5장의 엔드포인트별 요구 권한과 맞춘다.
 * ⚠️ 이 가드는 UX 용이며, 실제 접근 통제는 서버가 담당한다.
 */
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route index element={<DashboardPage />} />

                  {/* 회원 관리 — SUPER_ADMIN · GENERAL_ADMIN */}
                  <Route element={<ProtectedRoute roles={['SUPER_ADMIN', 'GENERAL_ADMIN']} />}>
                    <Route
                      path="members"
                      element={
                        <PlaceholderPage
                          title="회원 관리"
                          endpoints={[
                            'GET /admin/members?keyword&role&page&size',
                            'GET /admin/members/{id}',
                            'PATCH · DELETE /admin/members/{id} (SUPER_ADMIN)',
                            'GET /admin/members/{id}/devices',
                          ]}
                        />
                      }
                    />
                    <Route
                      path="members/:memberId"
                      element={
                        <PlaceholderPage
                          title="회원 상세"
                          endpoints={[
                            'GET /admin/members/{id}',
                            'GET /admin/members/{id}/devices',
                            'GET /admin/inquiries?memberId',
                            'GET /admin/reports/members.csv',
                          ]}
                        />
                      }
                    />
                    <Route
                      path="payments"
                      element={
                        <PlaceholderPage
                          title="결제·구독 관리"
                          endpoints={[
                            'GET /admin/members/{id}/subscription (가격 파라미터 추가 요청됨)',
                            '환불 처리 API — 백엔드 요청 완료',
                            '마스킹 해제는 SUPER_ADMIN 전용 · 감사 로그 대상',
                          ]}
                        />
                      }
                    />
                  </Route>

                  {/* 공지 관리 — SUPER_ADMIN */}
                  <Route element={<ProtectedRoute roles={['SUPER_ADMIN']} />}>
                    <Route
                      path="notices"
                      element={
                        <PlaceholderPage
                          title="공지 관리"
                          endpoints={[
                            'GET · POST /admin/notices',
                            'PATCH · DELETE /admin/notices/{id}',
                            'GET /admin/notices/{id} — 백엔드 요청 완료',
                            'POST /admin/notifications/broadcast',
                          ]}
                        />
                      }
                    />
                    <Route
                      path="harmful-keywords"
                      element={
                        <PlaceholderPage
                          title="유해사이트 관리"
                          endpoints={[
                            'GET · POST /admin/harmful-keywords',
                            'DELETE /admin/harmful-keywords/{id}',
                          ]}
                        />
                      }
                    />
                    <Route
                      path="audit-logs"
                      element={
                        <PlaceholderPage
                          title="감사 로그"
                          endpoints={[
                            'GET /admin/audit-logs?adminId&action&from&to&page&size',
                            '※ 생성·조회(C/R)만 허용. 수정·삭제 없음',
                          ]}
                        />
                      }
                    />
                    <Route
                      path="admins"
                      element={
                        <PlaceholderPage
                          title="관리자 계정 관리"
                          endpoints={[
                            'GET /admin/admins (배열 반환 — 페이징 아님)',
                            'PATCH /admin/admins/{id}',
                          ]}
                        />
                      }
                    />
                  </Route>

                  {/* 1:1 문의 — SUPER_ADMIN · GENERAL_ADMIN · INQUIRY_ADMIN */}
                  <Route
                    element={<ProtectedRoute roles={['SUPER_ADMIN', 'GENERAL_ADMIN', 'INQUIRY_ADMIN']} />}
                  >
                    <Route
                      path="inquiries"
                      element={
                        <PlaceholderPage
                          title="1:1 문의"
                          endpoints={[
                            'GET /admin/inquiries?status=OPEN|ANSWERED&page&size',
                            'GET /admin/inquiries/{id}',
                            'POST /admin/inquiries/{id}/answer',
                          ]}
                        />
                      }
                    />
                  </Route>

                  {/* 커뮤니티 관리 — SUPER_ADMIN · COMMUNITY_ADMIN */}
                  <Route element={<ProtectedRoute roles={['SUPER_ADMIN', 'COMMUNITY_ADMIN']} />}>
                    <Route
                      path="community"
                      element={
                        <PlaceholderPage
                          title="커뮤니티 관리"
                          endpoints={[
                            'GET /admin/community/posts — 백엔드 요청 완료',
                            'DELETE /admin/community/posts/{id}',
                            'POST /admin/community/members/{id}/ban',
                          ]}
                        />
                      }
                    />
                  </Route>

                  {/* 공통 UI 스타일 가이드 */}
                  <Route path="ui-kit" element={<UiKitPage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
