// External classification API client stub
// This module assumes existence of an API that, given a lat/lng bounding box or point/time window,
// returns a list of detected vessels (including non‑AIS / sensor-derived) with inferred type.
// Replace endpoint URLs and response normalization as soon as the actual service schema is known.

export interface ExternalDetectionRequest {
  bbox: { southwest: { lat: number; lng: number }; northeast: { lat: number; lng: number } };
  start: string; // ISO timestamp
  end: string;   // ISO timestamp
}

export interface ExternalDetectedVessel {
  id?: string; // sensor track id
  mmsi?: string; // may be absent for dark targets
  latitude: number;
  longitude: number;
  timestamp: string;
  confidence?: number; // 0..1 detection confidence
  inferredType?: string; // e.g., fishing, cargo, icebreaker, unknown
  source?: string; // e.g., 'SAR', 'RF', 'Optical'
  lengthEstimateM?: number;
  heading?: number;
  speedKnotsEstimate?: number;
  _raw?: unknown; // full original record for debug
}

export interface ExternalClassificationResponse {
  detections: ExternalDetectedVessel[];
  count: number;
  // Optional processing metadata
  windowStart?: string;
  windowEnd?: string;
  latencyMs?: number;
}

export class ExternalClassificationClient {
  constructor(private readonly baseUrl: string) { }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json'
    };
  }

  async classifyDetections(req: ExternalDetectionRequest): Promise<ExternalClassificationResponse> {
    // Placeholder endpoint; adjust path when real API known.
    const url = `${this.baseUrl}/classify/detections`;
    try {
      const res = await fetch(url, { method: 'POST', headers: this.headers(), body: JSON.stringify(req) });
      if (!res.ok) throw new Error(`External classification failed ${res.status}`);
      const data = await res.json();
      const rawDetections: unknown[] = Array.isArray(data.detections) ? data.detections : Array.isArray(data) ? data : [];
      const detections: ExternalDetectedVessel[] = rawDetections.map(d => this.normalizeDetection(d)).filter(Boolean) as ExternalDetectedVessel[];
      return {
        detections,
        count: detections.length,
        windowStart: req.start,
        windowEnd: req.end
      };
    } catch (e) {
      console.error('[ExternalClassification] classifyDetections error', e);
      return { detections: [], count: 0 };
    }
  }

  private normalizeDetection(d: unknown): ExternalDetectedVessel | null {
    if (typeof d !== 'object' || d === null) return null;
    const r = d as Record<string, unknown>;
    const lat = r.lat ?? r.latitude;
    const lon = r.lon ?? r.lng ?? r.longitude;
    const ts = r.timestamp ?? r.ts ?? r.time;
    if (lat == null || lon == null || ts == null) return null;
    return {
      id: (r.id ?? r.trackId ?? r.track_id) as string | undefined,
      mmsi: (r.mmsi as string | undefined) ?? (r.MMSI as string | undefined),
      latitude: Number(lat),
      longitude: Number(lon),
      timestamp: typeof ts === 'string' ? ts : new Date(Number(ts)).toISOString(),
      confidence: typeof r.confidence === 'number' ? r.confidence : undefined,
      inferredType: (r.inferredType ?? r.type ?? r.classification) as string | undefined,
      source: (r.source ?? r.sensor) as string | undefined,
      lengthEstimateM: typeof r.length === 'number' ? r.length : typeof r.length_m === 'number' ? r.length_m : undefined,
      heading: typeof r.heading === 'number' ? r.heading : undefined,
      speedKnotsEstimate: typeof r.speed === 'number' ? r.speed : typeof r.sog === 'number' ? r.sog : undefined,
      _raw: d
    };
  }
}

export const externalClassificationClient = new ExternalClassificationClient(process.env.NEXT_PUBLIC_CLASSIFICATION_API_BASE || 'https://example.com/api');
