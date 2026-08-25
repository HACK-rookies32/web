import './Spinner.css';

interface SpinnerProps {
  size?: number;
  /** 로딩 중임을 알리는 문구. 스크린리더에만 읽힌다. */
  label?: string;
}

export function Spinner({ size = 20, label = '불러오는 중' }: SpinnerProps) {
  return (
    <span
      className="spinner"
      role="status"
      style={{ width: `${size}px`, height: `${size}px`, borderWidth: `${Math.max(2, size / 10)}px` }}
    >
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** 표/카드 안에서 로딩 자리를 채우는 블록. */
export function LoadingBlock({ label = '불러오는 중' }: { label?: string }) {
  return (
    <div className="loading-block">
      <Spinner size={28} label={label} />
      <p className="loading-block__text">{label}...</p>
    </div>
  );
}
