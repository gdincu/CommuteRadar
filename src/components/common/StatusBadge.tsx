interface StatusBadgeProps {
  label: string;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
}

const TONE_PREFIX: Record<StatusBadgeProps['tone'], string> = {
  success: '✓',
  warning: '!',
  danger: '✕',
  neutral: '•'
};

/** Always pairs color with a symbol + text label so state isn't conveyed by color alone. */
export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return (
    <span className="badge" data-tone={tone === 'neutral' ? undefined : tone}>
      <span aria-hidden="true">{TONE_PREFIX[tone]}</span>
      {label}
    </span>
  );
}
