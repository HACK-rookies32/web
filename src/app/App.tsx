/**
 * 전역 셸.
 * 스캐폴드 단계에서는 부팅 확인용 화면만 렌더한다.
 * 라우터 · 인증 · 서버 상태 프로바이더는 이후 커밋에서 붙인다.
 */
export function App() {
  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <h1>케어가드 어드민</h1>
        <p style={{ marginTop: 'var(--space-2)', color: 'var(--text-muted)' }}>
          자녀보호앱 관리자 콘솔 · 프로젝트 셋업 완료
        </p>
      </div>
    </main>
  );
}
