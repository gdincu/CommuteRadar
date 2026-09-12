import type { Checkpoint } from '../../types/checkpoint';

interface CheckpointListItemProps {
  checkpoint: Checkpoint;
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (checkpoint: Checkpoint) => void;
  onDelete: (id: string) => void;
}

export function CheckpointListItem({ checkpoint, onToggle, onEdit, onDelete }: CheckpointListItemProps) {
  return (
    <div className="card stack">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700 }}>{checkpoint.name}</div>
          <div className="metric-label">Radius {checkpoint.radiusMeters} m</div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="visually-hidden">Enable {checkpoint.name}</span>
          <input
            type="checkbox"
            checked={checkpoint.enabled}
            onChange={(e) => onToggle(checkpoint.id, e.target.checked)}
          />
        </label>
      </div>
      <div className="stack" style={{ flexDirection: 'row' }}>
        <button className="secondary-button" style={{ flex: 1 }} onClick={() => onEdit(checkpoint)}>
          Edit
        </button>
        <button className="secondary-button danger-button" style={{ flex: 1 }} onClick={() => onDelete(checkpoint.id)}>
          Delete
        </button>
      </div>
    </div>
  );
}
