import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  type Column,
  EmptyState,
  FormField,
  Icon,
  ListToolbar,
  Pagination,
  Select,
  StatusPill,
  Table,
  TextInput,
} from '@/shared/ui';
import { formatDateTime } from '@/shared/lib/format';
import { useListParams } from '@/shared/hooks/useListParams';
import { DEFAULT_PAGE_SIZE } from '@/shared/lib/constants';
import { AUDIT_ACTION_LABEL, type AuditAction } from '@/shared/lib/audit';
import { auditLogKeys, fetchAuditLogs } from '../api';
import type { AuditLogItem, AuditLogListParams } from '../types';
import './AuditLogsPage.css';

function actionTone(action: AuditAction): 'danger' | 'warning' | 'info' | 'neutral' | 'accent' {
  if (action.includes('DELETE') || action === 'MEMBER_BAN') return 'danger';
  if (action === 'PAYMENT_REFUND' || action === 'WALLET_ADJUST') return 'warning';
  if (action.includes('UPDATE') || action === 'MEMBER_SUSPEND') return 'info';
  if (action.includes('CREATE')) return 'accent';
  return 'neutral';
}

export function AuditLogsPage() {
  const { patchParams, resetParams, getParam, page } = useListParams();
  const adminIdValue = getParam('adminId');
  const actionValue = getParam('action');
  const from = getParam('from');
  const to = getParam('to');

  const params = useMemo<AuditLogListParams>(
    () => ({
      adminId: adminIdValue ? Number(adminIdValue) : undefined,
      action: actionValue ? (actionValue as AuditAction) : undefined,
      from: from || undefined,
      to: to || undefined,
      page,
      size: DEFAULT_PAGE_SIZE,
    }),
    [adminIdValue, actionValue, from, to, page],
  );

  const query = useQuery({
    queryKey: auditLogKeys.list(params),
    queryFn: () => fetchAuditLogs(params),
  });

  const hasFilters = Boolean(adminIdValue || actionValue || from || to);
  const invalidPeriod = Boolean(from && to && from > to);

  const columns: Column<AuditLogItem>[] = [
    {
      key: 'id',
      header: '로그 ID',
      width: '112px',
      numeric: true,
      render: (row) => <span className="audit-logs__id">#{row.logId}</span>,
    },
    {
      key: 'admin',
      header: '관리자',
      width: '120px',
      numeric: true,
      render: (row) => <span>관리자 #{row.adminId}</span>,
    },
    {
      key: 'action',
      header: '활동',
      width: '190px',
      render: (row) => (
        <div className="audit-logs__action">
          <StatusPill tone={actionTone(row.action)}>{AUDIT_ACTION_LABEL[row.action]}</StatusPill>
          <code>{row.action}</code>
        </div>
      ),
    },
    {
      key: 'target',
      header: '대상',
      render: (row) => <code className="audit-logs__target">{row.target}</code>,
    },
    {
      key: 'createdAt',
      header: '발생일시',
      width: '190px',
      numeric: true,
      render: (row) => <span className="muted">{formatDateTime(row.createdAt)}</span>,
    },
  ];

  return (
    <div className="audit-logs">
      <Card className="audit-logs__filters" title="조회 조건" description="관리자, 활동 유형, 발생 기간으로 기록을 좁혀볼 수 있습니다.">
        <div className="audit-logs__filter-grid">
          <FormField label="관리자 ID">
            {(props) => (
              <TextInput
                {...props}
                type="number"
                min={1}
                inputMode="numeric"
                value={adminIdValue}
                placeholder="전체 관리자"
                onChange={(event) => patchParams({ adminId: event.target.value })}
              />
            )}
          </FormField>

          <FormField label="활동 유형">
            {(props) => (
              <Select {...props} value={actionValue} onChange={(event) => patchParams({ action: event.target.value })}>
                <option value="">전체 활동</option>
                {Object.entries(AUDIT_ACTION_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            )}
          </FormField>

          <FormField label="시작일" error={invalidPeriod ? '종료일보다 늦을 수 없습니다.' : undefined}>
            {(props) => (
              <TextInput {...props} type="date" value={from} max={to || undefined} onChange={(event) => patchParams({ from: event.target.value })} />
            )}
          </FormField>

          <FormField label="종료일">
            {(props) => (
              <TextInput {...props} type="date" value={to} min={from || undefined} onChange={(event) => patchParams({ to: event.target.value })} />
            )}
          </FormField>

          <div className="audit-logs__filter-action">
            <Button disabled={!hasFilters} onClick={resetParams}>필터 초기화</Button>
          </div>
        </div>
      </Card>

      <ListToolbar summary={`총 ${query.data?.totalElements ?? 0}건`} />

      <Card flush>
        <Table
          caption="관리자 감사 로그 목록"
          columns={columns}
          rows={invalidPeriod ? [] : query.data?.content ?? []}
          rowKey={(row) => row.logId}
          loading={!invalidPeriod && query.isPending}
          error={query.isError ? '감사 로그를 불러오지 못했습니다.' : undefined}
          emptyState={
            <EmptyState
              title={invalidPeriod ? '조회 기간을 확인해 주세요' : '감사 로그가 없습니다'}
              description={invalidPeriod ? '시작일은 종료일보다 늦을 수 없습니다.' : '현재 조건에 해당하는 활동 기록이 없습니다.'}
              icon={<Icon name="nav-audit" />}
              action={hasFilters ? <Button size="sm" onClick={resetParams}>필터 초기화</Button> : undefined}
            />
          }
          footer={
            !invalidPeriod && query.data && query.data.totalElements > 0 ? (
              <Pagination
                page={query.data.page}
                size={query.data.size}
                totalElements={query.data.totalElements}
                totalPages={query.data.totalPages}
                onChange={(next) => patchParams({ page: String(next) }, false)}
              />
            ) : undefined
          }
        />
      </Card>
    </div>
  );
}
