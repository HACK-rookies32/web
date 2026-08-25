import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Button,
  Card,
  Column,
  DetailBox,
  DetailRow,
  EmptyState,
  Icon,
  Modal,
  Pagination,
  SearchInput,
  Select,
  SlideOver,
  StackedCell,
  StatusPill,
  Table,
  useToast,
} from '@/shared/ui';
import { formatCurrency, formatDate, formatNumber, maskCard, maskEmail, maskName } from '@/shared/lib/format';
import { SUBSCRIPTION_STATUS, type SubscriptionStatus } from '@/shared/lib/status';
import { DEFAULT_PAGE_SIZE } from '@/shared/lib/constants';
import { useAuth } from '@/shared/auth/AuthContext';
import {
  fetchPaymentDetail,
  fetchPaymentSummary,
  fetchPayments,
  paymentKeys,
  refundPayment,
  unmaskCard,
} from '../api';
import type { PaymentListItem, PaymentMethodType } from '../types';
import { PaymentDetailPanel } from '../components/PaymentDetailPanel';
import './PaymentsPage.css';

const STATUS_FILTERS: { value: SubscriptionStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '구독 상태: 전체' },
  { value: 'ACTIVE', label: '활성' },
  { value: 'OVERDUE', label: '연체' },
  { value: 'CANCELED', label: '해지' },
];

const METHOD_FILTERS: { value: PaymentMethodType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '결제수단: 전체' },
  { value: 'CARD', label: '카드' },
  { value: 'EASY_PAY', label: '간편결제' },
];

/**
 * 결제·구독 관리 (Figma 131:3498).
 *
 * 회원 컨텍스트(/payments?memberId=)로 들어오면 해당 회원 건만 본다.
 * 환불 처리와 카드 마스킹 해제는 SUPER_ADMIN 전용이며 둘 다 감사 로그 대상이다.
 */
export function PaymentsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { hasRole, session } = useAuth();
  const canManage = hasRole(['SUPER_ADMIN']);

  const [searchParams, setSearchParams] = useSearchParams();
  const keyword = searchParams.get('keyword') ?? '';
  const status = (searchParams.get('status') as SubscriptionStatus | 'ALL' | null) ?? 'ALL';
  const method = (searchParams.get('method') as PaymentMethodType | 'ALL' | null) ?? 'ALL';
  const memberIdParam = searchParams.get('memberId');
  const memberId = memberIdParam ? Number(memberIdParam) : undefined;
  const page = Number(searchParams.get('page') ?? '0');

  const [selected, setSelected] = useState<PaymentListItem | null>(null);
  const [refundTarget, setRefundTarget] = useState<PaymentListItem | null>(null);
  /** 마스킹 해제된 카드 원문. subscriptionId → 원문 */
  const [revealed, setRevealed] = useState<Record<number, string>>({});

  const params = useMemo(
    () => ({ keyword, status, method, memberId, page, size: DEFAULT_PAGE_SIZE }),
    [keyword, status, method, memberId, page],
  );

  const list = useQuery({ queryKey: paymentKeys.list(params), queryFn: () => fetchPayments(params) });
  const summary = useQuery({ queryKey: paymentKeys.summary, queryFn: fetchPaymentSummary });

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

  const handleSearch = useCallback((value: string) => patchParams({ keyword: value }), [patchParams]);

  const refundMutation = useMutation({
    mutationFn: (subscriptionId: number) =>
      refundPayment({ subscriptionId, adminUsername: session?.username ?? 'unknown' }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });
      queryClient.invalidateQueries({ queryKey: paymentKeys.detail(result.subscriptionId) });
      setRefundTarget(null);
      toast.success(
        '환불이 처리되었습니다',
        `${maskName(result.memberName)} 회원에게 ${formatCurrency(result.amount)}이 환불되었으며 감사 로그에 기록되었습니다.`,
      );
    },
    onError: () => toast.error('환불 처리에 실패했습니다', '잠시 후 다시 시도해 주세요.'),
  });

  const unmaskMutation = useMutation({
    mutationFn: (subscriptionId: number) =>
      unmaskCard({ subscriptionId, adminUsername: session?.username ?? 'unknown' }),
    onSuccess: (cardNumber, subscriptionId) => {
      setRevealed((prev) => ({ ...prev, [subscriptionId]: cardNumber }));
      toast.showToast({
        tone: 'warning',
        title: '카드번호 원문을 표시합니다',
        description: '이 조회는 감사 로그에 기록되었습니다. 30초 후 자동으로 다시 가려집니다.',
      });
      window.setTimeout(() => {
        setRevealed((prev) => {
          const next = { ...prev };
          delete next[subscriptionId];
          return next;
        });
      }, 30_000);
    },
    onError: () => toast.error('마스킹 해제에 실패했습니다'),
  });

  function toggleUnmask(subscriptionId: number) {
    if (revealed[subscriptionId]) {
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[subscriptionId];
        return next;
      });
      return;
    }
    unmaskMutation.mutate(subscriptionId);
  }

  async function openRefundFromPanel(subscriptionId: number) {
    const detail = await fetchPaymentDetail(subscriptionId);
    setRefundTarget(detail);
  }

  const columns: Column<PaymentListItem>[] = [
    {
      key: 'member',
      header: '회원',
      width: '22%',
      render: (row) => (
        <StackedCell primary={maskName(row.memberName)} secondary={maskEmail(row.memberEmail)} />
      ),
    },
    {
      key: 'plan',
      header: '구독 플랜',
      width: '108px',
      render: (row) => (
        <StatusPill tone={row.planName === '프리미엄' ? 'accent' : 'neutral'}>{row.planName}</StatusPill>
      ),
    },
    {
      key: 'status',
      header: '상태',
      width: '88px',
      render: (row) => (
        <span className="payments__status">
          <StatusPill tone={SUBSCRIPTION_STATUS[row.status].tone}>
            {SUBSCRIPTION_STATUS[row.status].label}
          </StatusPill>
          {row.refundRequested ? <StatusPill tone="warning">환불 요청</StatusPill> : null}
        </span>
      ),
    },
    {
      key: 'method',
      header: '결제수단',
      render: (row) => (
        <span className="tabular payments__method">
          {row.method} ({maskCard(row.cardNumber)})
        </span>
      ),
    },
    {
      key: 'nextBillingDate',
      header: '다음 결제일',
      numeric: true,
      width: '112px',
      render: (row) =>
        row.nextBillingDate ? formatDate(row.nextBillingDate) : <span className="payments__muted">-</span>,
    },
    {
      key: 'amount',
      header: '결제 금액',
      align: 'right',
      numeric: true,
      width: '104px',
      render: (row) => <span className="payments__amount">{formatCurrency(row.amount)}</span>,
    },
    {
      key: 'actions',
      header: '액션',
      align: 'center',
      width: '72px',
      hoverOnly: true,
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          className="btn--icon-only"
          aria-label={`${maskName(row.memberName)} 결제 상세`}
          onClick={(e) => {
            e.stopPropagation();
            setSelected(row);
          }}
        >
          <Icon name="eye-view" />
        </Button>
      ),
    },
  ];

  const kpis = summary.data;

  return (
    <div className="payments">
      {memberId ? (
        <div className="payments__context">
          <span>
            회원 <strong className="tabular">#{memberId}</strong> 의 결제 내역만 보고 있습니다.
          </span>
          <button type="button" className="payments__context-clear" onClick={() => patchParams({ memberId: null })}>
            전체 보기
          </button>
        </div>
      ) : null}

      <div className="payments__toolbar">
        <SearchInput
          className="payments__search"
          value={keyword}
          onSearch={handleSearch}
          placeholder="회원명 또는 이메일 검색"
          aria-label="결제 검색"
        />

        <div className="payments__filters">
          <Select
            value={status}
            onChange={(e) => patchParams({ status: e.target.value === 'ALL' ? null : e.target.value })}
            aria-label="구독 상태 필터"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>

          <Select
            value={method}
            onChange={(e) => patchParams({ method: e.target.value === 'ALL' ? null : e.target.value })}
            aria-label="결제수단 필터"
          >
            {METHOD_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* ---- KPI ---- */}
      <section className="payments__kpis" aria-label="결제 지표">
        <article className="payments__kpi">
          <span className="payments__kpi-label">활성 구독</span>
          <span className="payments__kpi-value tabular">{formatNumber(kpis?.activeSubscriptions ?? 0)}</span>
          <span className="payments__kpi-foot">전월 대비 +5.2% 증가</span>
        </article>
        <article className="payments__kpi">
          <span className="payments__kpi-label">이번 달 매출</span>
          <span className="payments__kpi-value tabular">{formatCurrency(kpis?.monthlyRevenue ?? 0)}</span>
          <span className="payments__kpi-foot">전월 대비 +12.4% 증가</span>
        </article>
        <article className="payments__kpi">
          <span className="payments__kpi-label">결제 실패</span>
          <span className="payments__kpi-value tabular">{formatNumber(kpis?.failedPayments ?? 0)}건</span>
          <span className="payments__kpi-foot">전월 대비 2건 감소</span>
        </article>
        <article className="payments__kpi payments__kpi--alert">
          <span className="payments__kpi-label">환불 요청</span>
          <span className="payments__kpi-value tabular">{formatNumber(kpis?.refundRequests ?? 0)}건</span>
          <span className="payments__kpi-foot">전월 대비 동일</span>
        </article>
      </section>

      <Card flush>
        <Table
          caption="결제·구독 목록"
          columns={columns}
          rows={list.data?.content ?? []}
          rowKey={(r) => r.subscriptionId}
          loading={list.isPending}
          error={list.isError ? '결제 목록을 불러오지 못했습니다.' : undefined}
          onRowClick={(row) => setSelected(row)}
          emptyState={
            <EmptyState
              title="조회된 결제 내역이 없습니다"
              description="검색어나 필터를 바꿔보세요."
              icon={<Icon name="search" />}
              action={
                <Button size="sm" onClick={() => setSearchParams(new URLSearchParams())}>
                  필터 초기화
                </Button>
              }
            />
          }
          footer={
            list.data && list.data.totalElements > 0 ? (
              <Pagination
                page={list.data.page}
                totalPages={list.data.totalPages}
                totalElements={list.data.totalElements}
                size={list.data.size}
                onChange={(next) => patchParams({ page: String(next) }, false)}
              />
            ) : undefined
          }
        />
      </Card>

      {/* ---- 결제 상세 슬라이드오버 ---- */}
      <SlideOver
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="결제 상세 정보"
        subtitle={selected ? maskEmail(selected.memberEmail) : undefined}
      >
        {selected ? (
          <PaymentDetailPanel
            subscriptionId={selected.subscriptionId}
            unmaskedCard={revealed[selected.subscriptionId] ?? null}
            canManage={canManage}
            unmasking={unmaskMutation.isPending}
            onUnmask={() => toggleUnmask(selected.subscriptionId)}
            onRefund={() => void openRefundFromPanel(selected.subscriptionId)}
          />
        ) : null}
      </SlideOver>

      {/* ---- 환불 확인 모달 ---- */}
      <Modal
        open={refundTarget !== null}
        onClose={() => setRefundTarget(null)}
        size="sm"
        title="환불을 처리할까요?"
        description="환불은 되돌릴 수 없으며, 이 작업은 감사 로그에 기록됩니다."
        footer={
          <>
            <Button onClick={() => setRefundTarget(null)} disabled={refundMutation.isPending}>
              취소
            </Button>
            <Button
              variant="primary"
              loading={refundMutation.isPending}
              onClick={() => refundTarget && refundMutation.mutate(refundTarget.subscriptionId)}
            >
              환불 처리
            </Button>
          </>
        }
      >
        {refundTarget ? (
          <DetailBox>
            <DetailRow label="회원" value={maskName(refundTarget.memberName)} />
            <DetailRow label="구독 플랜" value={refundTarget.planName} />
            <DetailRow
              label="결제수단"
              value={<span className="tabular">{maskCard(refundTarget.cardNumber)}</span>}
            />
            <DetailRow label="환불 금액" value={formatCurrency(refundTarget.amount)} />
          </DetailBox>
        ) : null}
      </Modal>

      <p className="payments__footnote">
        구독 정보는 회원 상세에서도 확인할 수 있습니다.{' '}
        <Link to="/members">회원 관리로 이동</Link>
      </p>
    </div>
  );
}
