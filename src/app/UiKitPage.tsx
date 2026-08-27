import { useState } from 'react';
import {
  Button,
  Card,
  Column,
  DetailBox,
  DetailRow,
  EmptyState,
  FormField,
  Icon,
  Modal,
  PageHeader,
  Pagination,
  RowActions,
  SearchInput,
  Select,
  SlideOver,
  Spinner,
  StackedCell,
  StatusPill,
  Table,
  Tabs,
  TextArea,
  TextInput,
  Toggle,
  useToast,
} from '@/shared/ui';
import { formatCurrency, maskCard, maskEmail, maskName } from '@/shared/lib/format';
import './UiKitPage.css';

/**
 * 공통 UI 스타일 가이드.
 *
 * Figma 토큰이 실제 화면에서 어떻게 보이는지 한자리에서 확인하기 위한 페이지다.
 * 화면 구현이 끝난 뒤에도 /ui-kit 경로로 남겨 두면 공통 컴포넌트를 고칠 때
 * 회귀를 눈으로 바로 확인할 수 있다.
 */

interface DemoRow {
  id: number;
  name: string;
  email: string;
  plan: '프리미엄' | '베이직';
  status: '활성' | '연체' | '해지';
  card: string;
  amount: number;
}

const DEMO_ROWS: DemoRow[] = [
  { id: 1, name: '김민수', email: 'minsu@gmail.com', plan: '프리미엄', status: '활성', card: '1234567812341234', amount: 29900 },
  { id: 2, name: '이서진', email: 'seojin@naver.com', plan: '베이직', status: '연체', card: '9876543212345678', amount: 9900 },
  { id: 3, name: '박준호', email: 'junho@daum.net', plan: '프리미엄', status: '해지', card: '4111111111111111', amount: 29900 },
];

const STATUS_TONE = {
  활성: 'success',
  연체: 'danger',
  해지: 'neutral',
} as const;

export function UiKitPage() {
  const toast = useToast();
  const [page, setPage] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [tab, setTab] = useState<'basic' | 'devices' | 'inquiries'>('basic');
  const [modalOpen, setModalOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [notify, setNotify] = useState(true);
  const [unmasked, setUnmasked] = useState(false);

  const columns: Column<DemoRow>[] = [
    {
      key: 'member',
      header: '회원',
      width: '30%',
      render: (row) => <StackedCell primary={maskName(row.name)} secondary={maskEmail(row.email)} />,
    },
    {
      key: 'plan',
      header: '요금제',
      render: (row) => (
        <StatusPill tone={row.plan === '프리미엄' ? 'accent' : 'neutral'}>{row.plan}</StatusPill>
      ),
    },
    {
      key: 'status',
      header: '상태',
      render: (row) => <StatusPill tone={STATUS_TONE[row.status]}>{row.status}</StatusPill>,
    },
    {
      key: 'card',
      header: '결제수단',
      render: (row) => <span className="tabular">{maskCard(row.card, unmasked)}</span>,
    },
    {
      key: 'amount',
      header: '결제 금액',
      align: 'right',
      numeric: true,
      render: (row) => formatCurrency(row.amount),
    },
    {
      key: 'actions',
      header: '액션',
      align: 'center',
      hoverOnly: true,
      width: '92px',
      render: () => (
        <RowActions>
          <Button variant="ghost" size="sm" className="btn--icon-only" aria-label="상세 보기">
            <Icon name="eye-view" />
          </Button>
          <Button variant="ghost" size="sm" className="btn--icon-only" aria-label="삭제">
            <Icon name="trash" />
          </Button>
        </RowActions>
      ),
    },
  ];

  return (
    <div className="uikit">
      <PageHeader
        title="공통 UI 스타일 가이드"
        description="Figma(SK쉴더스 루키즈 H.A.C.K) 토큰을 그대로 적용한 공통 컴포넌트 모음입니다."
        badge={<StatusPill tone="accent">v0.1</StatusPill>}
        actions={
          <>
            <Button onClick={() => toast.success('저장했습니다', '변경 사항이 반영되었습니다.')}>
              토스트 띄우기
            </Button>
            <Button variant="primary" iconRight={<Icon name="arrow-right" />}>
              주요 액션
            </Button>
          </>
        }
      />

      <div className="uikit__grid">
        {/* ---- 색상 토큰 ---- */}
        <Card title="색상 토큰" description="색상은 반드시 CSS 변수로만 사용합니다.">
          <div className="swatches">
            {[
              ['--accent', 'accent'],
              ['--accent-hover', 'accent-hover'],
              ['--accent-strong', 'accent-strong'],
              ['--bg', 'bg'],
              ['--surface', 'surface'],
              ['--surface-subtle', 'surface-subtle'],
              ['--surface-tint', 'surface-tint'],
              ['--border', 'border'],
              ['--text-strong', 'text-strong'],
              ['--text', 'text'],
              ['--success', 'success'],
              ['--warning', 'warning'],
              ['--danger', 'danger'],
              ['--info', 'info'],
            ].map(([token, label]) => (
              <div className="swatch" key={token}>
                <span className="swatch__chip" style={{ background: `var(${token})` }} />
                <span className="swatch__label">{label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* ---- 버튼 ---- */}
        <Card title="버튼" description="variant 5종 / size 3종">
          <div className="stack">
            <div className="row">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="dark">Dark</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
            <div className="row">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
            </div>
            <Button variant="primary" size="lg" block iconRight={<Icon name="arrow-right" />}>
              로그인
            </Button>
          </div>
        </Card>

        {/* ---- 상태 배지 ---- */}
        <Card title="상태 배지" description="색 외에 형태(tag/pill)로도 구분합니다.">
          <div className="stack">
            <div className="row">
              <StatusPill tone="success">활성</StatusPill>
              <StatusPill tone="warning">처리중</StatusPill>
              <StatusPill tone="danger">연체</StatusPill>
              <StatusPill tone="info">안내</StatusPill>
              <StatusPill tone="neutral">해지</StatusPill>
              <StatusPill tone="accent">프리미엄</StatusPill>
            </div>
            <div className="row">
              <StatusPill tone="success" shape="pill">
                활성
              </StatusPill>
              <StatusPill tone="danger" shape="pill">
                연체
              </StatusPill>
              <StatusPill tone="neutral" shape="pill">
                해지
              </StatusPill>
            </div>
          </div>
        </Card>

        {/* ---- 입력 ---- */}
        <Card title="입력 폼">
          <div className="stack">
            <FormField label="아이디" required>
              {(p) => <TextInput {...p} placeholder="관리자 아이디를 입력하세요" />}
            </FormField>
            <FormField label="비밀번호" error="비밀번호가 일치하지 않습니다.">
              {(p) => <TextInput {...p} type="password" placeholder="비밀번호를 입력하세요" />}
            </FormField>
            <FormField label="권한" hint="슈퍼 관리자만 변경할 수 있습니다.">
              {(p) => (
                <Select {...p} defaultValue="SUPER_ADMIN">
                  <option value="SUPER_ADMIN">슈퍼 관리자</option>
                  <option value="GENERAL_ADMIN">일반 관리자</option>
                </Select>
              )}
            </FormField>
            <FormField label="본문">{(p) => <TextArea {...p} placeholder="내용을 입력하세요" />}</FormField>
            <Toggle
              checked={notify}
              onChange={setNotify}
              label="모바일 공지 페이지 노출"
              description="끄면 관리자 웹에서만 보입니다."
            />
            <SearchInput value={keyword} onSearch={setKeyword} placeholder="회원명 또는 이메일 검색" />
          </div>
        </Card>

        {/* ---- 탭 ---- */}
        <Card title="탭">
          <Tabs
            aria-label="회원 상세 탭"
            value={tab}
            onChange={setTab}
            items={[
              { key: 'basic', label: '기본 정보' },
              { key: 'devices', label: '연결 기기 관리', count: 3 },
              { key: 'inquiries', label: '1:1 문의 기록', count: 12 },
            ]}
          >
            <p className="uikit__tabtext">
              선택된 탭: <strong>{tab}</strong> — 좌우 방향키로도 이동할 수 있습니다.
            </p>
          </Tabs>
        </Card>

        {/* ---- 오버레이 ---- */}
        <Card title="오버레이 / 상태">
          <div className="stack">
            <div className="row">
              <Button onClick={() => setModalOpen(true)}>모달 열기</Button>
              <Button onClick={() => setPanelOpen(true)}>슬라이드오버 열기</Button>
              <Button variant="danger" onClick={() => toast.error('실패했습니다', '잠시 후 다시 시도해 주세요.')}>
                에러 토스트
              </Button>
            </div>
            <div className="row">
              <Spinner />
              <Spinner size={28} />
            </div>
            <EmptyState
              title="조회된 내용이 없습니다"
              description="검색 조건을 바꾸거나 필터를 초기화해 보세요."
              icon={<Icon name="search" />}
              action={<Button size="sm">필터 초기화</Button>}
            />
          </div>
        </Card>
      </div>

      {/* ---- 표 ---- */}
      <Card
        title="목록 표"
        description="행에 마우스를 올리면 액션 버튼이 나타납니다."
        action={
          <Button size="sm" onClick={() => setUnmasked((v) => !v)} iconLeft={<Icon name="eye-view" />}>
            {unmasked ? '마스킹 적용' : '마스킹 해제'}
          </Button>
        }
        flush
      >
        <Table
          caption="공통 표 예시"
          columns={columns}
          rows={DEMO_ROWS}
          rowKey={(r) => r.id}
          onRowClick={(r) => toast.showToast({ tone: 'info', title: `${maskName(r.name)} 행을 클릭했습니다` })}
          footer={
            <Pagination page={page} totalPages={3} totalElements={1284} size={10} onChange={setPage} />
          }
        />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="환불 처리 확인"
        description="이 작업은 되돌릴 수 없으며 감사 로그에 기록됩니다."
        footer={
          <>
            <Button onClick={() => setModalOpen(false)}>취소</Button>
            <Button
              variant="primary"
              onClick={() => {
                setModalOpen(false);
                toast.success('환불이 처리되었습니다', '₩29,900이 환불 요청되었습니다.');
              }}
            >
              환불 처리
            </Button>
          </>
        }
      >
        <DetailBox>
          <DetailRow label="회원" value="김*수" />
          <DetailRow label="결제수단" value={<span className="tabular">{maskCard('1234567812341234')}</span>} />
          <DetailRow label="환불 금액" value={formatCurrency(29900)} />
        </DetailBox>
      </Modal>

      <SlideOver
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title="결제 상세 정보"
        subtitle="min***@gmail.com"
        footer={
          <>
            <Button onClick={() => setPanelOpen(false)}>환불 처리</Button>
            <Button variant="dark" iconLeft={<Icon name="eye-view" />}>
              마스킹 해제
            </Button>
          </>
        }
      >
        <DetailBox>
          <DetailRow label="결제수단" value={<span className="tabular">{maskCard('1234567812341234')}</span>} />
          <DetailRow label="청구 주소" value="서울시 강남구 테헤란로 ***" />
          <DetailRow label="다음 결제일" value="2023-11-24" />
        </DetailBox>
        <EmptyState title="결제 이력이 없습니다" description="아직 기록된 결제가 없습니다." />
      </SlideOver>
    </div>
  );
}
