import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  danger = true,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(4, 10, 16, 0.7)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 50
      }}
      role="presentation"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        className="card stack"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        tabIndex={-1}
        style={{ margin: 16, maxWidth: 440, width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-dialog-title">{title}</h3>
        <p id="confirm-dialog-desc">{description}</p>
        <div className="stack" style={{ flexDirection: 'row' }}>
          <button className="secondary-button" style={{ flex: 1 }} onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`primary-button${danger ? ' danger-button' : ''}`}
            style={{ flex: 1 }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
