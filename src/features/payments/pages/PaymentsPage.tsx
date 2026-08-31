import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SlideOver, Tabs, useToast } from '@/shared/ui';
import { formatCurrency, formatDateTime, josa, maskName, memberRef } from '@/shared/lib/format';
import type { ChargeStatus, StorePaymentStatus, WalletSummary } from '@/shared/lib/wallet';
import { useAuth } from '@/shared/auth/AuthContext';
import { useAuditLogSync } from '@/shared/hooks/useAuditLogSync';
import { useListParams } from '@/shared/hooks/useListParams';
import { adjustWallet, cancelCharge, fundKeys } from '../api';
import type { ChargeItem, FundsFlowFilter } from '../types';
import { ChargesTab } from '../components/ChargesTab';
import { StorePaymentsTab } from '../components/StorePaymentsTab';
import { WalletsTab } from '../components/WalletsTab';
import { WalletDetailPanel } from '../components/WalletDetailPanel';
import { RefundModal } from '../components/RefundModal';
import { AdjustBalanceModal } from '../components/AdjustBalanceModal';
import './PaymentsPage.css';

type TabKey = 'charges' | 'payments' | 'wallets';
const TAB_KEYS: TabKey[] = ['charges', 'payments', 'wallets'];

/**
 * 자금·결제 관리 (API 명세 5.9).
 *
 * 구독/PG 대행 모델이 폐기되고 자체 지갑 기반으로 바뀌면서 화면을 재구성했다.
 *
 *   충전·용돈   — 부모가 카드로 충전한 기록 + 자녀에게 보낸 용돈 이동 (충전 취소 대상)
 *   매장 결제   — 자녀가 QR 로 매장에서 결제한 기록 (조회 전용)
 *   회원 지갑   — 회원별 잔액과 거래 원장 (잔액 수동 증액 대상)
 *
 * 조회는 SUPER_ADMIN·GENERAL_ADMIN, 충전 취소와 잔액 조정은 SUPER_ADMIN 전용이다.
 */
export function PaymentsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const syncAuditLog = useAuditLogSync();
  const { hasRole, session } = useAuth();
  // [VULN-WEB-05] 권한 상승 — 충전취소·잔액조정이 SUPER_ADMIN 전용이어야 하나
  //   hasRole()(인증만) 이라 전 역할에 자금 조작 버튼이 노출된다(A01).
  //   서버측 [VULN-ADMIN-1](GENERAL_ADMIN 도 호출 가능)과 맞물린다.
  //   대응: hasRole(['SUPER_ADMIN']).
  const canManage = hasRole();

  const { searchParams, setSearchParams, patchParams, page } = useListParams();
  const tabParam = searchParams.get('tab') as TabKey | null;
  const tab: TabKey = tabParam && TAB_KEYS.includes(tabParam) ? tabParam : 'charges';

  const keyword = searchParams.get('keyword') ?? '';
  const memberIdParam = searchParams.get('memberId');
  const memberId = memberIdParam ? Number(memberIdParam) : undefined;

  const [walletTarget, setWalletTarget] = useState<WalletSummary | null>(null);
  const [chargeRefundTarget, setChargeRefundTarget] = useState<ChargeItem | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<WalletSummary | null>(null);

  /** 탭을 바꾸면 탭마다 의미가 다른 필터는 비운다. */
  function changeTab(next: TabKey) {
    setSearchParams((prev) => {
      const params = new URLSearchParams();
      params.set('tab', next);
      const kept = prev.get('memberId');
      if (kept) params.set('memberId', kept);
      return params;
    });
  }

  const chargeRefundMutation = useMutation({
    mutationFn: (vars: { merchantUid: string; reason: string }) =>
      cancelCharge({ ...vars, adminUsername: session?.username ?? 'unknown' }),
    /*
     * 서버 응답에는 회원 이름이 없다. 안내 문구에 쓸 이름은 화면이 이미 들고 있는
     * 대상에서 가져온다 — onSuccess 에서 대상을 비우기 전에 읽어 둔다.
     */
    onSuccess: (result) => {
      const name = maskName(chargeRefundTarget?.userName ?? '');
      const amount = formatCurrency(result.refundedAmount);
      queryClient.invalidateQueries({ queryKey: fundKeys.all });
      syncAuditLog();
      setChargeRefundTarget(null);
      toast.success(
        '충전을 취소했습니다',
        `${name} 회원의 지갑에서 ${amount}${josa(amount, '이')} 차감되었으며 감사 로그에 기록되었습니다.`,
      );
    },
    onError: (e) =>
      toast.error('충전 취소에 실패했습니다', e instanceof Error ? e.message : undefined),
  });

  const adjustMutation = useMutation({
    mutationFn: (vars: { userId: number; amount: number; reason: string }) =>
      adjustWallet({ ...vars, adminUsername: session?.username ?? 'unknown' }),
    /* 서버 응답에 회원 이름이 없다. 대상을 비우기 전에 화면이 들고 있던 이름을 읽는다. */
    onSuccess: (result) => {
      const name = maskName(adjustTarget?.userName ?? '');
      const balance = formatCurrency(result.balance);
      queryClient.invalidateQueries({ queryKey: fundKeys.all });
      syncAuditLog();
      setAdjustTarget(null);
      toast.success(
        '잔액을 조정했습니다',
        `${name} 지갑 잔액이 ${balance}${josa(balance, '이')} 되었으며 감사 로그에 기록되었습니다.`,
      );
    },
    onError: (e) =>
      toast.error('잔액 조정에 실패했습니다', e instanceof Error ? e.message : undefined),
  });

  return (
    <div className="funds">
      <Tabs
        aria-label="자금·결제 관리 탭"
        value={tab}
        onChange={changeTab}
        items={[
          { key: 'charges', label: '충전·용돈' },
          { key: 'payments', label: '매장 결제 내역' },
          { key: 'wallets', label: '회원 지갑' },
        ]}
      >
        {tab === 'charges' ? (
          <ChargesTab
            keyword={keyword}
            status={(searchParams.get('status') as ChargeStatus | 'ALL' | null) ?? 'ALL'}
            flow={(searchParams.get('flow') as FundsFlowFilter | null) ?? 'ALL'}
            userId={memberId}
            page={page}
            canManage={canManage}
            patchParams={patchParams}
            setSearchParams={setSearchParams}
            onRefund={setChargeRefundTarget}
          />
        ) : null}

        {tab === 'payments' ? (
          <StorePaymentsTab
            keyword={keyword}
            status={(searchParams.get('status') as StorePaymentStatus | 'ALL' | null) ?? 'ALL'}
            page={page}
            patchParams={patchParams}
            setSearchParams={setSearchParams}
          />
        ) : null}

        {tab === 'wallets' ? (
          <WalletsTab
            keyword={keyword}
            role={(searchParams.get('role') as 'ALL' | 'PARENT' | 'CHILD' | null) ?? 'ALL'}
            page={page}
            canManage={canManage}
            patchParams={patchParams}
            setSearchParams={setSearchParams}
            onOpen={setWalletTarget}
            onAdjust={setAdjustTarget}
          />
        ) : null}
      </Tabs>

      {!canManage ? (
        <p className="funds__note">
          충전 취소 · 잔액 수동 조정은 슈퍼 관리자만 사용할 수 있습니다. 조회는 모두 가능합니다.
        </p>
      ) : null}

      {/* ---- 지갑 상세 슬라이드오버 ---- */}
      <SlideOver
        open={walletTarget !== null}
        onClose={() => setWalletTarget(null)}
        title="지갑 상세"
        subtitle={
          walletTarget
            ? `${maskName(walletTarget.userName)} (${memberRef(walletTarget.userId, walletTarget.role === 'CHILD' ? '자녀' : '회원')})`
            : undefined
        }
      >
        {walletTarget ? <WalletDetailPanel userId={walletTarget.userId} /> : null}
      </SlideOver>

      {/* 충전 취소 — 카드로 돈이 돌아가므로 지갑에서 차감된다(위와 방향이 반대). */}
      <RefundModal
        open={chargeRefundTarget !== null}
        title="충전을 취소할까요?"
        description="충전액만큼 회원 지갑에서 차감됩니다. 잔액이 부족하면 취소할 수 없으며, 이 작업은 감사 로그에 자동 기록됩니다."
        confirmLabel="충전 취소"
        reasonPlaceholder="예: 잘못 충전 민원 처리"
        details={
          chargeRefundTarget
            ? [
                {
                  label: '회원',
                  value: `${maskName(chargeRefundTarget.userName)} (${memberRef(chargeRefundTarget.userId)})`,
                },
                { label: '결제수단', value: chargeRefundTarget.method },
                { label: '충전 일시', value: formatDateTime(chargeRefundTarget.createdAt) },
                { label: '차감 금액', value: formatCurrency(chargeRefundTarget.amount) },
              ]
            : []
        }
        submitting={chargeRefundMutation.isPending}
        onClose={() => setChargeRefundTarget(null)}
        onSubmit={(reason) =>
          chargeRefundTarget?.merchantUid &&
          chargeRefundMutation.mutate({ merchantUid: chargeRefundTarget.merchantUid, reason })
        }
      />

      <AdjustBalanceModal
        wallet={adjustTarget}
        submitting={adjustMutation.isPending}
        onClose={() => setAdjustTarget(null)}
        onSubmit={(amount, reason) =>
          adjustTarget && adjustMutation.mutate({ userId: adjustTarget.userId, amount, reason })
        }
      />
    </div>
  );
}
