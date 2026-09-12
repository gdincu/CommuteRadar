import { useMemo } from 'react';
import type { LocationSample } from '../../types/trip';

interface RoutePreviewProps {
  samples: LocationSample[];
}

/**
 * A purely local, provider-free sketch of the route shape — projects raw
 * lat/lon onto a simple flat SVG canvas. This is NOT a map (no tiles, no
 * street context, no panning/zooming) and is intentionally optional: it
 * exists so a user can sanity-check "did my GPS actually follow my route"
 * without pulling in a mapping SDK.
 */
export function RoutePreview({ samples }: RoutePreviewProps) {
  const path = useMemo(() => buildPath(samples), [samples]);

  if (samples.length < 2) return null;

  return (
    <div className="card" aria-hidden="true">
      <svg viewBox="0 0 300 160" width="100%" height="140" role="img" aria-label="Simplified route shape">
        <polyline points={path} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function buildPath(samples: LocationSample[]): string {
  const lats = samples.map((s) => s.latitude);
  const lons = samples.map((s) => s.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const width = 300;
  const height = 160;
  const padding = 12;

  const latRange = maxLat - minLat || 1e-6;
  const lonRange = maxLon - minLon || 1e-6;

  return samples
    .map((s) => {
      const x = padding + ((s.longitude - minLon) / lonRange) * (width - padding * 2);
      // Latitude increases northward but SVG y increases downward — flip it.
      const y = height - padding - ((s.latitude - minLat) / latRange) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
