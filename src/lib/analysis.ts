import type { VesselPosition, AnalysisMetrics, AnalyzedVessel, VesselStaticInfo } from './types';
import { VesselClassification } from './types';

// Haversine distance in nautical miles
function haversineNm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const Rm = 6371000; // meters
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  const meters = Rm * c;
  return meters / 1852; // meters to nautical miles
}

interface ClassificationOptions {
  stationarySpeedThreshold?: number; // knots
  dwellSpeedThreshold?: number; // knots (below this considered dwelling)
  minTransitDistanceNm?: number; // distance to be considered transit
  minDurationMinutes?: number; // ignore ultra-short sequences
  maneuveringHeadingStdDev?: number; // heading stddev to classify maneuvering
  anchoredMaxSpeed?: number; // upper speed bound for anchored classification
  anchoredMaxDriftNmPerHour?: number; // total distance / hours max
}

const defaultOptions: Required<ClassificationOptions> = {
  stationarySpeedThreshold: 0.5,
  dwellSpeedThreshold: 2,
  minTransitDistanceNm: 5,
  minDurationMinutes: 15,
  maneuveringHeadingStdDev: 25,
  anchoredMaxSpeed: 3,
  anchoredMaxDriftNmPerHour: 0.8
};

export function computeAnalysisMetrics(mmsi: string, positions: VesselPosition[]): AnalysisMetrics {
  if (positions.length === 0) {
    return {
      mmsi,
      pointCount: 0,
      startTime: new Date(0).toISOString(),
      endTime: new Date(0).toISOString(),
      durationHours: 0,
      totalDistanceNm: 0,
      avgSpeed: 0,
      maxSpeed: 0,
      speedStdDev: 0,
      headingStdDev: 0,
      dwellRatio: 0
    };
  }

  // Sort by timestamp
  const sorted = [...positions].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  let totalDist = 0;
  const speeds: number[] = [];
  const headings: number[] = [];
  let dwellSamples = 0;

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    speeds.push(p.speed);
    if (typeof p.heading === 'number') headings.push(p.heading);
    if (p.speed < defaultOptions.dwellSpeedThreshold) dwellSamples++;
    if (i > 0) {
      const prev = sorted[i - 1];
      totalDist += haversineNm({ lat: prev.latitude, lon: prev.longitude }, { lat: p.latitude, lon: p.longitude });
    }
  }

  const startTime = sorted[0].timestamp;
  const endTime = sorted[sorted.length - 1].timestamp;
  const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();
  const durationHours = durationMs / 1000 / 3600;

  const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  const maxSpeed = Math.max(...speeds);
  const speedMean = avgSpeed;
  const speedVariance = speeds.reduce((acc, v) => acc + Math.pow(v - speedMean, 2), 0) / speeds.length;
  const speedStdDev = Math.sqrt(speedVariance);

  let headingStdDev: number | undefined = undefined;
  if (headings.length > 1) {
    // Circular standard deviation (approx): convert to radians, compute mean resultant length R
    const rad = headings.map(h => (h * Math.PI) / 180);
    const sumSin = rad.reduce((a, r) => a + Math.sin(r), 0);
    const sumCos = rad.reduce((a, r) => a + Math.cos(r), 0);
    const R = Math.sqrt(sumSin * sumSin + sumCos * sumCos) / rad.length;
    const circStd = Math.sqrt(-2 * Math.log(R));
    headingStdDev = circStd * (180 / Math.PI);
  }

  const dwellRatio = dwellSamples / speeds.length;

  return {
    mmsi,
    pointCount: sorted.length,
    startTime,
    endTime,
    durationHours,
    totalDistanceNm: Number(totalDist.toFixed(3)),
    avgSpeed: Number(avgSpeed.toFixed(2)),
    maxSpeed: Number(maxSpeed.toFixed(2)),
    speedStdDev: Number(speedStdDev.toFixed(2)),
    headingStdDev: headingStdDev ? Number(headingStdDev.toFixed(2)) : undefined,
    dwellRatio: Number(dwellRatio.toFixed(3))
  };
}

export function classifyVessel(metrics: AnalysisMetrics, _positions: VesselPosition[], _staticInfo?: VesselStaticInfo, options?: ClassificationOptions): { classification: VesselClassification; rationale: string } {
  const o = { ...defaultOptions, ...(options || {}) };
  const { avgSpeed, maxSpeed, totalDistanceNm, durationHours, dwellRatio, headingStdDev } = metrics;

  if (metrics.pointCount === 0 || durationHours * 60 < o.minDurationMinutes) {
    return { classification: VesselClassification.UNKNOWN, rationale: 'Insufficient data duration or points' };
  }

  // Stationary / Anchored checks
  if (avgSpeed < o.stationarySpeedThreshold && totalDistanceNm < o.anchoredMaxDriftNmPerHour * Math.max(durationHours, 0.1)) {
    return { classification: VesselClassification.STATIONARY, rationale: 'Very low average speed and minimal positional drift' };
  }

  if (maxSpeed <= o.anchoredMaxSpeed && totalDistanceNm < o.anchoredMaxDriftNmPerHour * durationHours && dwellRatio > 0.7) {
    return { classification: VesselClassification.ANCHORED, rationale: 'Low speed profile with high dwell ratio and limited drift' };
  }

  // Transit: sustained movement distance
  if (totalDistanceNm >= o.minTransitDistanceNm && avgSpeed >= o.dwellSpeedThreshold) {
    return { classification: VesselClassification.TRANSIT, rationale: 'Covered significant distance at sustained speed' };
  }

  // Maneuvering: moderate distance but high heading variance
  if (headingStdDev && headingStdDev > o.maneuveringHeadingStdDev && avgSpeed > o.stationarySpeedThreshold) {
    return { classification: VesselClassification.MANEUVERING, rationale: 'High heading variance indicative of maneuvering' };
  }

  // Fallback
  return { classification: VesselClassification.UNKNOWN, rationale: 'Heuristics did not match any category decisively' };
}

export function analyzeVessel(mmsi: string, positions: VesselPosition[], staticInfo?: VesselStaticInfo, options?: ClassificationOptions): AnalyzedVessel {
  const metrics = computeAnalysisMetrics(mmsi, positions);
  const { classification, rationale } = classifyVessel(metrics, positions, staticInfo, options);
  return { mmsi, positions, staticInfo, metrics, classification, rationale };
}

export function groupPositionsByMMSI(positions: VesselPosition[]): { mmsi: string; positions: VesselPosition[] }[] {
  const map = new Map<string, VesselPosition[]>();
  for (const p of positions) {
    const arr = map.get(p.mmsi);
    if (arr) arr.push(p); else map.set(p.mmsi, [p]);
  }
  return Array.from(map.entries()).map(([mmsi, pos]) => ({ mmsi, positions: pos }));
}
