import { Suspense, lazy } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/shared/auth/AuthContext';
import { ProtectedRoute } from '@/shared/auth/ProtectedRoute';
import { LoadingBlock, ToastProvider } from '@/shared/ui';
import { AppLayout } from './layout/AppLayout';

/* 페이지는 라우트 단위로 lazy 로드한다. */
const LoginPage = lazy(() =>
  import('@/features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const DashboardPage = lazy(() =>
  import('@/features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const MembersPage = lazy(() =>
  import('@/features/members/pages/MembersPage').then((m) => ({ default: m.MembersPage })),
);
const MemberDetailPage = lazy(() =>
  import('@/features/members/pages/MemberDetailPage').then((m) => ({ default: m.MemberDetailPage })),
);
const PaymentsPage = lazy(() =>
  import('@/features/payments/pages/PaymentsPage').then((m) => ({ default: m.PaymentsPage })),
);
const NoticesPage = lazy(() =>
  import('@/features/notices/pages/NoticesPage').then((m) => ({ default: m.NoticesPage })),
);
const InquiriesPage = lazy(() =>
  import('@/features/inquiries/pages/InquiriesPage').then((m) => ({ default: m.InquiriesPage })),
);
const HarmfulKeywordsPage = lazy(() =>
  import('@/features/harmful-keywords/pages/HarmfulKeywordsPage').then((m) => ({
    default: m.HarmfulKeywordsPage,
  })),
);
const CommunityPage = lazy(() =>
  import('@/features/community/pages/CommunityPage').then((m) => ({ default: m.CommunityPage })),
);
const AuditLogsPage = lazy(() =>
  import('@/features/audit-logs/pages/AuditLogsPage').then((m) => ({ default: m.AuditLogsPage })),
);
const AdminsPage = lazy(() =>
  import('@/features/admins/pages/AdminsPage').then((m) => ({ default: m.AdminsPage })),
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
          {/* v7 동작을 미리 켜 둔다. 추후 업그레이드 시 동작이 바뀌지 않는다. */}
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            {/*
              페이지는 전부 lazy 다. AppLayout 안에도 Suspense 가 있지만 /login 은
              레이아웃 밖이라 경계가 없었다. 지금도 크래시는 나지 않지만 청크를
              받는 동안 빈 화면이 보이므로, 라우트 전체를 감싸 로딩 표시를 준다.
            */}
            <Suspense fallback={<LoadingBlock label="화면을 불러오는 중" />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />

                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route index element={<DashboardPage />} />

                    {/* 회원 관리 — SUPER_ADMIN · GENERAL_ADMIN */}
                    <Route element={<ProtectedRoute roles={['SUPER_ADMIN', 'GENERAL_ADMIN']} />}>
                      <Route path="members" element={<MembersPage />} />
                      <Route path="members/:memberId" element={<MemberDetailPage />} />
                      <Route path="payments" element={<PaymentsPage />} />
                    </Route>

                    {/* 공지 관리 — SUPER_ADMIN */}
                    <Route element={<ProtectedRoute roles={['SUPER_ADMIN']} />}>
                      <Route path="notices" element={<NoticesPage />} />
                      <Route path="harmful-keywords" element={<HarmfulKeywordsPage />} />
                      <Route path="audit-logs" element={<AuditLogsPage />} />
                      <Route path="admins" element={<AdminsPage />} />
                    </Route>

                    {/* 1:1 문의 — SUPER_ADMIN · INQUIRY_ADMIN (명세 5.4) */}
                    <Route element={<ProtectedRoute roles={['SUPER_ADMIN', 'INQUIRY_ADMIN']} />}>
                      <Route path="inquiries" element={<InquiriesPage />} />
                    </Route>

                    {/* 커뮤니티 관리 — SUPER_ADMIN · COMMUNITY_ADMIN (명세 5.5) */}
                    <Route element={<ProtectedRoute roles={['SUPER_ADMIN', 'COMMUNITY_ADMIN']} />}>
                      <Route path="community" element={<CommunityPage />} />
                    </Route>

                    {/* 공통 UI 스타일 가이드 */}
                    <Route path="ui-kit" element={<UiKitPage />} />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
