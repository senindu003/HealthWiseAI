interface SpinnerProps {
  size?: number;
  className?: string;
}

export default function Spinner({ size = 18, className = '' }: SpinnerProps) {
  return (
    <span
      className={`material-symbols-outlined animate-spin ${className}`}
      style={{ fontSize: size }}
      aria-label="Loading"
    >
      progress_activity
    </span>
  );
}
