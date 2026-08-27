import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AUDIT_LOG_QUERY_KEY } from '@/shared/lib/audit';

/**
 * 감사 대상 활동을 끝낸 뒤 감사 로그 목록을 다시 불러오게 한다.
 *
 * 회원 삭제·계정 정지·강제 환불·잔액 조정 등은 서버가 감사 로그를 자동으로
 * 남기지만, 그 사실을 프론트의 쿼리 캐시는 알 수 없다. 무효화를 빠뜨리면
 * staleTime(30초) 안에 감사 로그 화면을 열었을 때 방금 한 작업이 빠진 채로
 * 캐시가 그대로 나온다. 실제로 그래서 "다른 작업은 안 보이다가 환불할 때
 * 몰아서 보인다" 는 현상이 있었다 — 환불이 특별했던 게 아니라 그 사이에
 * 30초가 지났을 뿐이다.
 *
 * 감사 로그를 남기는 뮤테이션의 onSuccess 에서 반드시 호출한다.
 */
export function useAuditLogSync(): () => void {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: AUDIT_LOG_QUERY_KEY });
  }, [queryClient]);
}
