export interface VesselPosition {
  mmsi: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading?: number;
  vesselName?: string;
  vesselType?: string;
}

export interface AISQueryParams {
  bbox: string; // "lon1,lat1,lon2,lat2"
  start: string; // "YYYYMMDDHHMM"
  end: string; // "YYYYMMDDHHMM"
  minSpeed: number;
}

export interface AISResponse {
  positions: VesselPosition[];
  count: number;
}

export interface ArcticLocation {
  id: string;
  name: string;
  description: string;
  bbox: {
    southwest: { lat: number; lng: number };
    northeast: { lat: number; lng: number };
  };
  strategicImportance: string;
  surveillanceChallenges: string[];
}

export interface Timeframe {
  start: Date;
  end: Date;
}

// --- Added for static vessel info enrichment ---
export interface VesselStaticInfo {
  mmsi: string;
  name?: string;
  callsign?: string;
  imo?: number;
  shipType?: string; // Raw ship type description or code mapping
  shipTypeCode?: number; // Numeric type code if available
  length?: number; // meters
  beam?: number; // meters
  draught?: number; // meters
  flag?: string; // ISO 2 or country name
  destination?: string;
  eta?: string; // Expected format from API (retain as-is)
  aisClass?: 'A' | 'B';
  /** Timestamp (ISO string) corresponding to the static snapshot retrieval */
  statTimestamp?: string;
  /** Raw original payload for debugging / future mapping */
  _raw?: unknown;
}

// --- Analysis & Classification Types ---
export enum VesselClassification {
  STATIONARY = 'STATIONARY',
  ANCHORED = 'ANCHORED',
  MANEUVERING = 'MANEUVERING',
  TRANSIT = 'TRANSIT',
  UNKNOWN = 'UNKNOWN'
}

export interface AnalysisMetrics {
  mmsi: string;
  pointCount: number;
  startTime: string;
  endTime: string;
  durationHours: number;
  totalDistanceNm: number; // nautical miles
  avgSpeed: number; // knots
  maxSpeed: number; // knots
  speedStdDev: number; // knots
  headingStdDev?: number; // degrees (if headings provided)
  dwellRatio: number; // fraction of time below slowSpeedThreshold
}

export interface AnalyzedVessel {
  mmsi: string;
  positions: VesselPosition[];
  staticInfo?: VesselStaticInfo;
  metrics: AnalysisMetrics;
  classification: VesselClassification;
  /** Optional human readable rationale for classification */
  rationale?: string;
}

// Helper shape for grouped position collections before analysis
export interface VesselPositionsGroup {
  mmsi: string;
  positions: VesselPosition[];
}