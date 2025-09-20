import type { AnalyzedVessel } from './types';
import type { ExternalDetectedVessel } from './classification-client';

export interface ConsistencyIssue {
  code: 'TYPE_MISMATCH' | 'SIZE_IMPLAUSIBLE' | 'SPEED_OUT_OF_RANGE' | 'INFERRED_CONFLICT';
  severity: 'low' | 'medium' | 'high';
  message: string;
  context?: Record<string, unknown>;
}

export interface ConsistencyReport {
  mmsi: string;
  issues: ConsistencyIssue[];
  inferredType?: string;
  declaredType?: string;
  summary: 'OK' | 'WARN' | 'ALERT';
}

const typeNormalization: Record<string, string> = {
  tanker: 'TANKER',
  crude: 'TANKER',
  bulk: 'BULK',
  bulker: 'BULK',
  cargo: 'CARGO',
  container: 'CONTAINER',
  fishing: 'FISHING',
  fish: 'FISHING',
  research: 'RESEARCH',
  supply: 'SUPPORT',
  support: 'SUPPORT',
  icebreaker: 'ICEBREAKER',
  passenger: 'PASSENGER',
  ferry: 'PASSENGER'
};

function normalizeType(raw?: string): string | undefined {
  if (!raw) return undefined;
  const k = raw.toLowerCase().replace(/[^a-z]/g, '');
  return typeNormalization[k] || raw.toUpperCase();
}

interface SizeExpectation {
  minLength: number;
  maxLength: number;
}

const typeSizeExpectations: Record<string, SizeExpectation> = {
  TANKER: { minLength: 60, maxLength: 400 },
  BULK: { minLength: 60, maxLength: 330 },
  CARGO: { minLength: 50, maxLength: 350 },
  CONTAINER: { minLength: 100, maxLength: 400 },
  FISHING: { minLength: 8, maxLength: 90 },
  RESEARCH: { minLength: 20, maxLength: 150 },
  SUPPORT: { minLength: 15, maxLength: 120 },
  ICEBREAKER: { minLength: 50, maxLength: 180 },
  PASSENGER: { minLength: 30, maxLength: 360 }
};

const typeSpeedExpectations: Record<string, { maxSpeed: number }> = {
  TANKER: { maxSpeed: 22 },
  BULK: { maxSpeed: 22 },
  CARGO: { maxSpeed: 26 },
  CONTAINER: { maxSpeed: 30 },
  FISHING: { maxSpeed: 18 },
  RESEARCH: { maxSpeed: 20 },
  SUPPORT: { maxSpeed: 24 },
  ICEBREAKER: { maxSpeed: 24 },
  PASSENGER: { maxSpeed: 34 }
};

export function buildConsistencyReport(v: AnalyzedVessel, external?: ExternalDetectedVessel[]): ConsistencyReport {
  const issues: ConsistencyIssue[] = [];
  const declaredType = normalizeType(v.staticInfo?.shipType);
  const inferredCandidates = new Set<string>();
  (external || []).forEach(d => {
    const norm = normalizeType(d.inferredType);
    if (norm) inferredCandidates.add(norm);
  });
  const inferredType = inferredCandidates.size === 1 ? Array.from(inferredCandidates)[0] : undefined;

  // Type mismatch
  if (declaredType && inferredType && declaredType !== inferredType) {
    issues.push({
      code: 'TYPE_MISMATCH',
      severity: 'medium',
      message: `Declared type ${declaredType} differs from inferred ${inferredType}`,
      context: { declaredType, inferredType }
    });
  }

  // Size plausibility
  if (declaredType && v.staticInfo) {
    const exp = typeSizeExpectations[declaredType];
    if (exp && v.staticInfo.length) {
      if (v.staticInfo.length < exp.minLength || v.staticInfo.length > exp.maxLength) {
        issues.push({
          code: 'SIZE_IMPLAUSIBLE',
          severity: 'medium',
          message: `Length ${v.staticInfo.length}m unusual for ${declaredType} (expected ${exp.minLength}-${exp.maxLength}m)`,
          context: { length: v.staticInfo.length, declaredType }
        });
      }
    }
  }

  // Speed out of expected range
  if (declaredType && v.metrics) {
    const expSpeed = typeSpeedExpectations[declaredType];
    if (expSpeed && v.metrics.maxSpeed > expSpeed.maxSpeed * 1.15) {
      issues.push({
        code: 'SPEED_OUT_OF_RANGE',
        severity: 'high',
        message: `Observed max speed ${v.metrics.maxSpeed} kn exceeds typical ${declaredType} capability (${expSpeed.maxSpeed} kn)`
      });
    }
  }

  // Conflicting multiple inferred types
  if (inferredCandidates.size > 1) {
    issues.push({
      code: 'INFERRED_CONFLICT',
      severity: 'low',
      message: `Multiple inferred types: ${Array.from(inferredCandidates).join(', ')}`
    });
  }

  const summary: ConsistencyReport['summary'] = issues.some(i => i.severity === 'high')
    ? 'ALERT'
    : issues.length > 0
      ? 'WARN'
      : 'OK';

  return { mmsi: v.mmsi, issues, inferredType, declaredType, summary };
}
