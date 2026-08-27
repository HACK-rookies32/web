/**
 * 표시용 포맷터 모음.
 * 개인정보 마스킹은 반드시 이 파일의 유틸을 거치도록 한다 (화면마다 다르게 가리는 것을 방지).
 */

/* ---------------------------------------------------------------- 날짜 ---- */

const pad = (n: number) => String(n).padStart(2, '0');

/** 2023-11-24 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 2023-11-24 10:23:45 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return `${formatDate(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** "3분 전", "2시간 전", "어제" 처럼 상대 시각으로. */
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';

  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;

  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;

  const day = Math.floor(hour / 24);
  if (day === 1) return '어제';
  if (day < 7) return `${day}일 전`;
  return formatDate(iso);
}

/* ---------------------------------------------------------------- 숫자 ---- */

/** 1,248 */
export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '-';
  return n.toLocaleString('ko-KR');
}

/** ₩38,520,000 — 음수는 -₩87,999 처럼 부호를 기호 앞에 둔다. */
export function formatCurrency(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '-';
  const sign = n < 0 ? '-' : '';
  return `${sign}₩${Math.abs(n).toLocaleString('ko-KR')}`;
}

/* -------------------------------------------------------------- 마스킹 ---- */

/**
 * 카드번호 마스킹. API 명세 5.2 의 maskedCard 형식을 따른다.
 * `1234-****-****-5678` — 앞 4자리와 뒤 4자리를 남기고 가운데를 가린다.
 *
 * 마스킹 해제는 SUPER_ADMIN 권한 + 감사 로그 기록이 전제다. 화면에서 직접
 * 원문을 조립하지 말고 반드시 이 유틸의 unmasked 인자를 쓸 것.
 */
export function maskCard(cardNumber: string, unmasked = false): string {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 8) return '****-****-****-****';

  const groups = digits.match(/.{1,4}/g) ?? [];
  if (unmasked) return groups.join('-');

  return groups
    .map((g, i) => (i === 0 || i === groups.length - 1 ? g : '*'.repeat(g.length)))
    .join('-');
}

/** 김민욱 → 김*욱 / 김수 → 김*  */
export function maskName(name: string): string {
  if (!name) return '-';
  if (name.length <= 2) return `${name[0]}*`;
  return `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}`;
}

/**
 * 조치 대상을 특정하기 위한 식별자 표기. 예: `회원 #1001`
 *
 * 이름·연락처는 마스킹해 보여주므로 동명이인을 화면만으로 구분할 수 없다.
 * 회원 ID 는 개인정보가 아니면서 유일하게 식별하므로, 되돌리기 어려운 조치를
 * 확정하는 화면(자금 이동·삭제·정지)에는 반드시 함께 표시한다.
 * 마스킹을 풀지 않고 동일인 확인 문제를 해결하는 것이 목적이다.
 */
export function memberRef(id: number, label = '회원'): string {
  return `${label} #${id}`;
}

/**
 * 마스킹 후에도 화면에 그대로 남는 구간의 길이.
 *
 * 목록 검색이 원문을 대상으로 부분 일치하면, 가려 놓은 구간을 검색 결과의
 * 참/거짓으로 역추론할 수 있다(마스킹이 무력화된다). 검색 조건은 반드시
 * 이 상수가 가리키는 "이미 보이는 구간"만 대상으로 삼는다.
 */
export const EMAIL_VISIBLE_PREFIX_LENGTH = 3;
export const PHONE_VISIBLE_SUFFIX_LENGTH = 4;

/** min***@gmail.com */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const head = local.slice(0, EMAIL_VISIBLE_PREFIX_LENGTH);
  return `${head}${'*'.repeat(Math.max(local.length - EMAIL_VISIBLE_PREFIX_LENGTH, 1))}@${domain}`;
}

/** 010-1234-5678 → 010-****-5678 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return phone;
  return `${digits.slice(0, 3)}-****-${digits.slice(-PHONE_VISIBLE_SUFFIX_LENGTH)}`;
}

/** 서울시 강남구 테헤란로 123 → 서울시 강남구 테헤란로 *** */
export function maskAddress(address: string): string {
  const parts = address.trim().split(/\s+/);
  if (parts.length <= 3) return address;
  return `${parts.slice(0, 3).join(' ')} ***`;
}

/* ---------------------------------------------------------------- CSV ---- */

/** 값 하나를 CSV 셀로 이스케이프한다. */
function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * 2차원 데이터를 CSV 문자열로. Excel 한글 깨짐 방지를 위해 BOM 을 붙인다.
 */
export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))];
  return `﻿${lines.join('\r\n')}`;
}

/** 브라우저에서 CSV 문자열을 파일로 내려받는다. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------- 조사 ---- */

/** 숫자를 한글로 읽었을 때 마지막 글자에 받침이 있는지. */
const DIGIT_HAS_FINAL: Record<string, boolean> = {
  '0': true, //  영 (ㅇ)
  '1': true, //  일 (ㄹ)
  '2': false, // 이
  '3': true, //  삼 (ㅁ)
  '4': false, // 사
  '5': false, // 오
  '6': true, //  육 (ㄱ)
  '7': true, //  칠 (ㄹ)
  '8': true, //  팔 (ㄹ)
  '9': false, // 구
};

/**
 * 마지막 글자에 받침이 있는지 판별한다.
 * 한글 음절은 유니코드에서 (초성×21+중성)×28+종성 으로 배열되므로
 * 코드포인트를 28로 나눈 나머지가 0이 아니면 받침이 있다.
 * 한글이 아니면 끝의 숫자를 보고, 그것도 없으면 받침이 없는 것으로 본다.
 */
function hasFinalConsonant(word: string): boolean {
  const last = word.trim().replace(/[)\]}”"'’\s.]+$/u, '').slice(-1);
  if (!last) return false;

  const code = last.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0;
  if (last >= '0' && last <= '9') return DIGIT_HAS_FINAL[last];
  return false;
}

/**
 * 앞말의 받침에 맞는 조사를 고른다.
 *
 *   josa('스포츠토토', '이')  // '가'
 *   josa('온라인 도박', '이') // '이'
 *
 * 한글 키워드를 허용하면서 "{키워드}이 차단되었습니다" 처럼 조사를 고정해 두면
 * 받침 없는 단어에서 어색해진다. 화면 문구를 만들 때 이 함수를 쓴다.
 */
export function josa(word: string, form: '이' | '을' | '은' | '와' | '으로'): string {
  const withFinal = hasFinalConsonant(word);
  switch (form) {
    case '이':
      return withFinal ? '이' : '가';
    case '을':
      return withFinal ? '을' : '를';
    case '은':
      return withFinal ? '은' : '는';
    case '와':
      return withFinal ? '과' : '와';
    case '으로':
      return withFinal ? '으로' : '로';
  }
}
