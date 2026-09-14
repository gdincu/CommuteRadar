import { useState, type FormEvent } from 'react';
import type { Checkpoint } from '../../types/checkpoint';

interface CheckpointFormProps {
  initial?: Checkpoint;
  onSave: (checkpoint: Checkpoint) => void;
  onCancel: () => void;
}

export function CheckpointForm({ initial, onSave, onCancel }: CheckpointFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [latitude, setLatitude] = useState(initial?.latitude?.toString() ?? '');
  const [longitude, setLongitude] = useState(initial?.longitude?.toString() ?? '');
  const [radius, setRadius] = useState(initial?.radiusMeters?.toString() ?? '100');
  const [notificationEnabled, setNotificationEnabled] = useState(initial?.notificationEnabled ?? true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(initial?.whatsappEnabled ?? false);
  const [whatsappPhone, setWhatsappPhone] = useState(initial?.whatsappPhone ?? '');
  const [whatsappMessage, setWhatsappMessage] = useState(
    initial?.whatsappMessage ?? 'Just reached {checkpoint}! It took {tripTime} over {distance}, averaging {averageSpeed}.'
  );
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const useCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocateError('Location is not supported in this browser.');
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      (err) => {
        setLocateError(err.message || 'Could not get your current location.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const rad = parseFloat(radius);
    if (!name.trim() || Number.isNaN(lat) || Number.isNaN(lon) || Number.isNaN(rad)) {
      setFormError('Please fill in every field with a valid value.');
      return;
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setFormError('Latitude must be between -90 and 90, and longitude between -180 and 180.');
      return;
    }
    if (rad <= 0) {
      setFormError('Radius must be a positive number of meters.');
      return;
    }
    if (whatsappEnabled && whatsappPhone.replace(/\D/g, '').length < 8) {
      setFormError('Enter a WhatsApp number with country code, digits only (e.g. 40712345678) — otherwise no message can be prepared.');
      return;
    }
    setFormError(null);

    const checkpoint: Checkpoint = {
      id: initial?.id ?? crypto.randomUUID(),
      schemaVersion: 1,
      name: name.trim(),
      latitude: lat,
      longitude: lon,
      radiusMeters: rad,
      enabled: initial?.enabled ?? true,
      notificationEnabled,
      whatsappEnabled,
      whatsappPhone: whatsappEnabled ? whatsappPhone.trim() : undefined,
      whatsappMessage: whatsappEnabled ? whatsappMessage.trim() : undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString()
    };
    onSave(checkpoint);
  };

  return (
    <form className="card stack" onSubmit={handleSubmit}>
      <label className="stack" style={{ gap: 4 }}>
        <span className="metric-label">Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Office" required />
      </label>

      <button type="button" className="secondary-button" onClick={useCurrentLocation} disabled={locating}>
        {locating ? 'Getting location…' : 'Use current location'}
      </button>
      {locateError && <p role="alert">{locateError}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <label className="stack" style={{ gap: 4 }}>
          <span className="metric-label">Latitude</span>
          <input
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            inputMode="decimal"
            placeholder="44.4268"
            required
          />
        </label>
        <label className="stack" style={{ gap: 4 }}>
          <span className="metric-label">Longitude</span>
          <input
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            inputMode="decimal"
            placeholder="26.1025"
            required
          />
        </label>
      </div>

      <label className="stack" style={{ gap: 4 }}>
        <span className="metric-label">Radius (meters)</span>
        <input value={radius} onChange={(e) => setRadius(e.target.value)} inputMode="numeric" required />
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="checkbox"
          checked={notificationEnabled}
          onChange={(e) => setNotificationEnabled(e.target.checked)}
        />
        Notify me when I reach this checkpoint
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" checked={whatsappEnabled} onChange={(e) => setWhatsappEnabled(e.target.checked)} />
        Prepare a WhatsApp message when reached
      </label>

      {whatsappEnabled && (
        <div className="stack" style={{ paddingLeft: 4, borderLeft: '2px solid var(--border)' }}>
          <label className="stack" style={{ gap: 4 }}>
            <span className="metric-label">WhatsApp number</span>
            <input
              value={whatsappPhone}
              onChange={(e) => setWhatsappPhone(e.target.value)}
              inputMode="tel"
              placeholder="40712345678 (country code, no +)"
            />
          </label>
          <label className="stack" style={{ gap: 4 }}>
            <span className="metric-label">Message template</span>
            <textarea
              value={whatsappMessage}
              onChange={(e) => setWhatsappMessage(e.target.value)}
              rows={3}
              style={{ resize: 'vertical', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', padding: 8 }}
            />
          </label>
          <p style={{ margin: 0 }}>
            Variables: {'{checkpoint}'}, {'{tripTime}'}, {'{distance}'}, {'{averageSpeed}'}, {'{date}'}, {'{time}'}.
            This opens WhatsApp with the message pre-filled — you still tap send. A browser can't send WhatsApp
            messages silently in the background.
          </p>
        </div>
      )}

      {formError && <p role="alert">{formError}</p>}

      <div className="stack" style={{ flexDirection: 'row' }}>
        <button type="button" className="secondary-button" style={{ flex: 1 }} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary-button" style={{ flex: 1 }}>
          Save checkpoint
        </button>
      </div>
    </form>
  );
}
