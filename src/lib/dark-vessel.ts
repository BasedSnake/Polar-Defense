import type { VesselPosition } from './types';
import type { ExternalDetectedVessel } from './classification-client';

// MMSIs that should always be treated / displayed as dark regardless of heuristic checks
export const FORCED_DARK_MMSIS = new Set<string>(['316014621']);
export function isForcedDark(mmsi: string): boolean { return FORCED_DARK_MMSIS.has(mmsi); }

export interface DarkVesselAnomaly {
  type: 'NO_AIS_MATCH' | 'MMSI_MISMATCH' | 'AIS_GAP' | 'UNUSUAL_BEHAVIOR';
  detection: ExternalDetectedVessel | null;
  mmsi?: string; // AIS track reference if applicable
  description: string;
  severity: 'low' | 'medium' | 'high';
  metadata?: Record<string, unknown>;
}

interface BuildIndexResult {
  byMMSI: Map<string, VesselPosition[]>;
}

function indexPositions(positions: VesselPosition[]): BuildIndexResult {
  const byMMSI = new Map<string, VesselPosition[]>();
  for (const p of positions) {
    const list = byMMSI.get(p.mmsi);
    if (list) list.push(p); else byMMSI.set(p.mmsi, [p]);
  }
  return { byMMSI };
}

function findNearestAISMatch(d: ExternalDetectedVessel, aisPositions: VesselPosition[], maxDistanceNm = 1.0, maxTimeDiffMin = 30): VesselPosition | null {
  const targetTime = new Date(d.timestamp).getTime();
  let best: { pos: VesselPosition; score: number } | null = null;
  for (const p of aisPositions) {
    const dtMin = Math.abs(new Date(p.timestamp).getTime() - targetTime) / 60000;
    if (dtMin > maxTimeDiffMin) continue;
    const distNm = haversineNm(d.latitude, d.longitude, p.latitude, p.longitude);
    if (distNm > maxDistanceNm) continue;
    const score = distNm + dtMin / 60; // simple combined cost
    if (!best || score < best.score) best = { pos: p, score };
  }
  return best?.pos || null;
}

function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const Rm = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (Rm * c) / 1852;
}

export function detectDarkVessels(aisPositions: VesselPosition[], externalDetections: ExternalDetectedVessel[]): DarkVesselAnomaly[] {
  const anomalies: DarkVesselAnomaly[] = [];
  const { byMMSI } = indexPositions(aisPositions);

  // 1. External detections with no AIS correlation
  for (const det of externalDetections) {
    if (det.mmsi && byMMSI.has(det.mmsi)) continue; // has AIS representation
    // Attempt spatial-temporal correlation against all AIS positions
    const flat = aisPositions; // performance: could spatial index later
    const matched = findNearestAISMatch(det, flat);
    if (!matched) {
      anomalies.push({
        type: 'NO_AIS_MATCH',
        detection: det,
        description: 'Sensor detection without corresponding AIS track (potential dark vessel).',
        severity: 'high',
        metadata: { inferredType: det.inferredType, source: det.source }
      });
    }
  }

  // 2. AIS targets without external confirmation (could be spoofed or low confidence) – heuristic
  // Simplified: mark vessels with only one AIS point in window.
  for (const [mmsi, list] of byMMSI.entries()) {
    if (list.length === 1) {
      anomalies.push({
        type: 'AIS_GAP',
        detection: null,
        mmsi,
        description: 'Single AIS point in interval (possible intermittent transmission).',
        severity: 'medium',
        metadata: { timestamp: list[0].timestamp }
      });
    }
  }

  // 3. Force specific MMSIs to be considered dark (manual intelligence / override)
  for (const forced of FORCED_DARK_MMSIS) {
    // Only add anomaly if the vessel appears in AIS (so we can tag it) or if we explicitly want a placeholder.
    const hasTrack = byMMSI.has(forced);
    if (hasTrack) {
      const already = anomalies.some(a => a.mmsi === forced && a.type === 'UNUSUAL_BEHAVIOR');
      if (!already) {
        anomalies.push({
          type: 'UNUSUAL_BEHAVIOR',
          detection: null,
          mmsi: forced,
          description: 'Manually flagged as dark (forced override).',
          severity: 'high',
          metadata: { reason: 'forced_dark_list' }
        });
      }
    }
  }

  return anomalies;
}
