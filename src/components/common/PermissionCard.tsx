interface PermissionCardProps {
  title: string;
  rationale: string;
  actionLabel: string;
  onRequest: () => void;
  deniedMessage?: string;
  isDenied?: boolean;
}

/**
 * Shows *why* a permission is needed before requesting it, and a clear
 * denied-state message pointing at browser settings rather than silently
 * failing or re-prompting.
 */
export function PermissionCard({
  title,
  rationale,
  actionLabel,
  onRequest,
  deniedMessage,
  isDenied
}: PermissionCardProps) {
  return (
    <div className="card stack" role="region" aria-label={title}>
      <h3>{title}</h3>
      {isDenied ? (
        <p>{deniedMessage ?? 'Permission is disabled. Enable it in your browser settings to continue.'}</p>
      ) : (
        <>
          <p>{rationale}</p>
          <button className="primary-button" onClick={onRequest}>
            {actionLabel}
          </button>
        </>
      )}
    </div>
  );
}
