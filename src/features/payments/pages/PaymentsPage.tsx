import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { SlideOver, Tabs, useToast } from '@/shared/ui';
import { formatCurrency, formatNumber, maskName } from '@/shared/lib/format';
import type { ChargeStatus, StorePaymentStatus, WalletSummary } from '@/shared/lib/wallet';
import { useAuth } from '@/shared/auth/AuthContext';
import { adjustWallet, fetchFundStats, fundKeys, refundStorePayment } from '../api';
import type { StorePayment } from '../types';
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
 *   충전 내역   — 부모가 카드로 지갑을 충전한 기록
 *   매장 결제   — 자녀가 QR 로 매장에서 결제한 기록 (강제 환불 대상)
 *   회원 지갑   — 회원별 잔액과 거래 원장 (잔액 수동 조정 대상)
 *
 * 조회는 SUPER_ADMIN·GENERAL_ADMIN, 강제 환불과 잔액 조정은 SUPER_ADMIN 전용이다.
 */
export function PaymentsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { hasRole, session } = useAuth();
  const canManage = hasRole(['SUPER_ADMIN']);

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as TabKey | null;
  const tab: TabKey = tabParam && TAB_KEYS.includes(tabParam) ? tabParam : 'charges';

  const keyword = searchParams.get('keyword') ?? '';
  const page = Number(searchParams.get('page') ?? '0');
  const memberIdParam = searchParams.get('memberId');
  const memberId = memberIdParam ? Number(memberIdParam) : undefined;

  const [walletTarget, setWalletTarget] = useState<WalletSummary | null>(null);
  const [refundTarget, setRefundTarget] = useState<StorePayment | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<WalletSummary | null>(null);

  const stats = useQuery({ queryKey: fundKeys.stats, queryFn: fetchFundStats });

  const patchParams = useCallback(
    (patch: Record<string, string | null>, resetPage = true) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(patch).forEach(([k, v]) => {
          if (v === null || v === '') next.delete(k);
          else next.set(k, v);
        });
        if (resetPage) next.delete('page');
        return next;
      });
    },
    [setSearchParams],
  );

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

  const refundMutation = useMutation({
    mutationFn: (vars: { paymentId: number; reason: string }) =>
      refundStorePayment({ ...vars, adminUsername: session?.username ?? 'unknown' }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: fundKeys.all });
      setRefundTarget(null);
      toast.success(
        '강제 환불이 처리되었습니다',
        `${maskName(result.childName)} 자녀에게 ${formatCurrency(result.amount)}이 원복되었으며 감사 로그에 기록되었습니다.`,
      );
    },
    onError: (e) =>
      toast.error('환불 처리에 실패했습니다', e instanceof Error ? e.message : undefined),
  });

  const adjustMutation = useMutation({
    mutationFn: (vars: { userId: number; amount: number; reason: string }) =>
      adjustWallet({ ...vars, adminUsername: session?.username ?? 'unknown' }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: fundKeys.all });
      setAdjustTarget(null);
      toast.success(
        '잔액을 조정했습니다',
        `${maskName(result.userName)} 지갑 잔액이 ${formatCurrency(result.balance)}이 되었으며 감사 로그에 기록되었습니다.`,
      );
    },
    onError: (e) =>
      toast.error('잔액 조정에 실패했습니다', e instanceof Error ? e.message : undefined),
  });

  const s = stats.data;

  return (
    <div className="funds">
      {/* ---- KPI (GET /admin/stats) ---- */}
      <section className="funds__kpis" aria-label="자금 지표">
        <article className="funds__kpi">
          <span className="funds__kpi-label">총 충전액</span>
          <span className="funds__kpi-value tabular">{formatCurrency(s?.totalCharged ?? 0)}</span>
          <span className="funds__kpi-foot">충전 {formatNumber(s?.chargeCount ?? 0)}건</span>
        </article>
        <article className="funds__kpi">
          <span className="funds__kpi-label">총 결제액</span>
          <span className="funds__kpi-value tabular">{formatCurrency(s?.totalPaid ?? 0)}</span>
          <span className="funds__kpi-foot">결제 {formatNumber(s?.paymentCount ?? 0)}건</span>
        </article>
        <article className="funds__kpi">
          <span className="funds__kpi-label">미사용 잔액</span>
          <span className="funds__kpi-value tabular">
            {formatCurrency((s?.totalCharged ?? 0) - (s?.totalPaid ?? 0))}
          </span>
          <span className="funds__kpi-foot">충전액 − 결제액</span>
        </article>
        <article className="funds__kpi funds__kpi--alert">
          <span className="funds__kpi-label">환불</span>
          <span className="funds__kpi-value tabular">{formatNumber(s?.refundCount ?? 0)}건</span>
          <span className="funds__kpi-foot">강제 환불 포함</span>
        </article>
      </section>

      <Tabs
        aria-label="자금·결제 관리 탭"
        value={tab}
        onChange={changeTab}
        items={[
          { key: 'charges', label: '충전 내역' },
          { key: 'payments', label: '매장 결제 내역' },
          { key: 'wallets', label: '회원 지갑' },
        ]}
      >
        {tab === 'charges' ? (
          <ChargesTab
            keyword={keyword}
            status={(searchParams.get('status') as ChargeStatus | 'ALL' | null) ?? 'ALL'}
            userId={memberId}
            page={page}
            patchParams={patchParams}
            setSearchParams={setSearchParams}
          />
        ) : null}

        {tab === 'payments' ? (
          <StorePaymentsTab
            keyword={keyword}
            status={(searchParams.get('status') as StorePaymentStatus | 'ALL' | null) ?? 'ALL'}
            page={page}
            canManage={canManage}
            patchParams={patchParams}
            setSearchParams={setSearchParams}
            onRefund={setRefundTarget}
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
          강제 환불과 잔액 수동 조정은 슈퍼 관리자만 사용할 수 있습니다. 조회는 모두 가능합니다.
        </p>
      ) : null}

      {/* ---- 지갑 상세 슬라이드오버 ---- */}
      <SlideOver
        open={walletTarget !== null}
        onClose={() => setWalletTarget(null)}
        title="지갑 상세"
        subtitle={walletTarget ? maskName(walletTarget.userName) : undefined}
      >
        {walletTarget ? <WalletDetailPanel userId={walletTarget.userId} /> : null}
      </SlideOver>

      <RefundModal
        payment={refundTarget}
        submitting={refundMutation.isPending}
        onClose={() => setRefundTarget(null)}
        onSubmit={(reason) =>
          refundTarget && refundMutation.mutate({ paymentId: refundTarget.paymentId, reason })
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
