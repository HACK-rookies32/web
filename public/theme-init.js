/*
 * 첫 페인트 전에 저장된 테마를 적용한다. React 마운트를 기다리면 다크
 * 사용자에게 흰 화면이 한 번 번쩍인다.
 *
 * 원래 index.html 안의 인라인 스크립트였다. CSP script-src 'self' 는 인라인
 * 스크립트를 차단하므로(XSS 방어의 핵심) 외부 파일로 분리했다. index.html 에서
 * <script src="/theme-init.js"></script> 로 불러 같은 효과를 낸다.
 *
 * 키 'careguard.theme' 는 src/shared/lib/constants.ts 의 THEME_STORAGE_KEY 와
 * 반드시 같아야 한다. OS 설정을 따르는 선택지는 없으므로 저장값이 없으면 라이트.
 */
(function () {
  var savedTheme = 'light';
  try {
    var stored = localStorage.getItem('careguard.theme');
    if (stored === 'light' || stored === 'dark') savedTheme = stored;
  } catch (e) {
    /* localStorage 접근이 막힌 환경에서는 기본값(라이트)을 쓴다 */
  }
  document.documentElement.setAttribute('data-theme', savedTheme);
})();
