import { useCallback } from 'react';
import { useSearchParams, type SetURLSearchParams } from 'react-router-dom';

/** `null` 이나 빈 문자열이면 해당 파라미터를 지운다. */
export type ParamPatch = Record<string, string | null>;

export interface ListParams {
  /** 현재 쿼리 문자열 */
  searchParams: URLSearchParams;
  /** 원본 setter. 탭 전환처럼 통째로 갈아끼울 때만 쓴다. */
  setSearchParams: SetURLSearchParams;
  /**
   * 쿼리 파라미터를 부분 갱신한다.
   *
   * @param patch      바꿀 값. `null` · `''` 은 파라미터를 지운다.
   * @param resetPage  검색·필터가 바뀌면 페이지를 0으로 되돌린다(기본 true).
   *                   페이지 이동이나 상세 열기처럼 목록 위치를 유지해야 하면 `false`.
   */
  patchParams: (patch: ParamPatch, resetPage?: boolean) => void;
  /** 필터를 모두 비운다. */
  resetParams: () => void;
  /** 문자열 파라미터 읽기 */
  getParam: (key: string) => string;
  /** 0-base 페이지 번호 */
  page: number;
}

/**
 * 목록 화면의 URL 쿼리 파라미터를 다룬다.
 *
 * 검색어·필터·페이지는 URL 로 관리한다는 규칙 때문에 화면마다 같은 함수를
 * 복사해 쓰고 있었다. 그러다 "빈 값을 어떻게 볼지" 가 화면마다 갈렸다.
 *   - 대부분: null 과 '' 을 지움
 *   - 커뮤니티: null 만 지워서 `?keyword=` 같은 빈 파라미터가 남을 수 있었음
 *   - 관리자 계정: 'ALL' 까지 함수 안에서 지움 (다른 화면은 호출부에서 처리)
 *
 * 여기로 모으면서 **null · 빈 문자열을 지운다** 로 통일했다.
 * `'ALL'` 같은 화면별 "전체" 값은 호출부에서 `value === 'ALL' ? null : value`
 * 로 넘긴다 — 어떤 값이 "전체" 인지는 화면마다 다르기 때문이다.
 */
export function useListParams(): ListParams {
  const [searchParams, setSearchParams] = useSearchParams();

  const patchParams = useCallback(
    (patch: ParamPatch, resetPage = true) => {
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous);
        Object.entries(patch).forEach(([key, value]) => {
          if (value === null || value === '') next.delete(key);
          else next.set(key, value);
        });
        if (resetPage) next.delete('page');
        return next;
      });
    },
    [setSearchParams],
  );

  const resetParams = useCallback(() => setSearchParams(new URLSearchParams()), [setSearchParams]);

  const getParam = useCallback((key: string) => searchParams.get(key) ?? '', [searchParams]);

  const page = Number(searchParams.get('page') ?? '0');

  return { searchParams, setSearchParams, patchParams, resetParams, getParam, page };
}
