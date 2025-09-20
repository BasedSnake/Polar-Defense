"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { arcticLocations } from "@/lib/arctic-locations";
import { aisApiClient } from "@/lib/ais-client";
import { analyzeVessel } from "@/lib/analysis";
import {
  buildConsistencyReport,
  type ConsistencyReport,
} from "@/lib/consistency";
import { MapView } from "./MapView";
import type {
  VesselPosition,
  AnalyzedVessel,
  VesselStaticInfo,
} from "@/lib/types";

interface VesselRowState {
  analyzed?: AnalyzedVessel;
  report?: ConsistencyReport;
  analyzing?: boolean;
  error?: string;
}

const JULY4 = new Date("2025-07-04T00:00:00Z");
const JULY4_END = new Date("2025-07-04T23:59:59Z");

const DEFAULT_LOCATION_ID = "vancouver";

interface FetchParams {
  locationId: string;
  start: Date;
  end: Date;
  minSpeed: number;
}

export function VesselDashboard() {
  const [locationId, setLocationId] = useState<string>(DEFAULT_LOCATION_ID);
  const [start, setStart] = useState<Date>(JULY4);
  const [end, setEnd] = useState<Date>(JULY4_END);
  const [minSpeed, setMinSpeed] = useState<number>(0);
  const [positions, setPositions] = useState<VesselPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMmsi, setSelectedMmsi] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, VesselRowState>>({});
  const [pinnedInput, setPinnedInput] = useState<string>("316014621");
  const pinnedMmsis = useMemo(
    () =>
      pinnedInput
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    [pinnedInput]
  );

  const location = useMemo(
    () => arcticLocations.find((l) => l.id === locationId),
    [locationId]
  );

  const grouped = useMemo(() => {
    // Build base map keyed by MMSI from fetched (Vancouver) data
    const base = new Map<string, VesselPosition[]>();
    for (const p of positions) {
      const arr = base.get(p.mmsi);
      if (arr) arr.push(p);
      else base.set(p.mmsi, [p]);
    }

    // If current location is Vancouver, no transformation needed
    let effective: Map<string, VesselPosition[]> = base;
    if (locationId !== "vancouver") {
      const targetLoc = arcticLocations.find((l) => l.id === locationId);
      const vancouver = arcticLocations.find((l) => l.id === "vancouver");
      if (targetLoc && vancouver) {
        const tSW = targetLoc.bbox.southwest;
        const tNE = targetLoc.bbox.northeast;
        const vSW = vancouver.bbox.southwest;
        const vNE = vancouver.bbox.northeast;
        const vWidth = vNE.lng - vSW.lng || 1;
        const vHeight = vNE.lat - vSW.lat || 1;
        const tWidth = tNE.lng - tSW.lng;
        const tHeight = tNE.lat - tSW.lat;

        const transformed = new Map<string, VesselPosition[]>();
        for (const [mmsi, posArr] of base.entries()) {
          // Deterministic pseudo-random seed from MMSI for jitter
          let seed = 0;
          for (let i = 0; i < mmsi.length; i++)
            seed = (seed * 31 + mmsi.charCodeAt(i)) >>> 0;
          const rand = () => {
            // xorshift32-like
            seed ^= seed << 13;
            seed ^= seed >>> 17;
            seed ^= seed << 5;
            return (seed >>> 0) / 0xffffffff;
          };
          const jitterLat = (rand() - 0.5) * 0.08 * tHeight; // up to ~8% bbox
          const jitterLng = (rand() - 0.5) * 0.08 * tWidth;
          const mapped = posArr.map((p) => {
            const fracX = (p.longitude - vSW.lng) / vWidth;
            const fracY = (p.latitude - vSW.lat) / vHeight;
            return {
              ...p,
              latitude: tSW.lat + fracY * tHeight + jitterLat,
              longitude: tSW.lng + fracX * tWidth + jitterLng,
            } as VesselPosition;
          });
          transformed.set(mmsi, mapped);
        }
        effective = transformed;
      }
    }

    // Ensure pinned exist
    for (const pm of pinnedMmsis) if (!effective.has(pm)) effective.set(pm, []);

    return Array.from(effective.entries())
      .map(([mmsi, pos]) => ({ mmsi, pos }))
      .sort((a, b) => {
        const ap = pinnedMmsis.includes(a.mmsi) ? 0 : 1;
        const bp = pinnedMmsis.includes(b.mmsi) ? 0 : 1;
        if (ap !== bp) return ap - bp;
        return a.mmsi.localeCompare(b.mmsi);
      });
  }, [positions, pinnedMmsis, locationId]);

  const analyzedList: AnalyzedVessel[] = useMemo(() => {
    return grouped.map(
      (g) => rows[g.mmsi]?.analyzed || analyzeVessel(g.mmsi, g.pos)
    );
  }, [grouped, rows]);

  const fetchPositions = useCallback(async (params: FetchParams) => {
    // Always use Vancouver data as source regardless of currently focused location.
    const vancouver = arcticLocations.find((l) => l.id === "vancouver");
    if (!vancouver) return;
    setLoading(true);
    setError(null);
    try {
      const bbox = aisApiClient.formatBoundingBox(
        vancouver.bbox.southwest,
        vancouver.bbox.northeast
      );
      const data = await aisApiClient.getVesselPositions({
        bbox,
        start: aisApiClient.formatDateForAPI(params.start),
        end: aisApiClient.formatDateForAPI(params.end),
        minSpeed: params.minSpeed,
      });
      setPositions(data.positions);
      setRows({});
      setSelectedMmsi(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed fetching AIS data");
      setPositions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial & parameter-driven fetch (location changes do NOT trigger new fetch anymore)
  useEffect(() => {
    void fetchPositions({ locationId: "vancouver", start, end, minSpeed });
  }, [start, end, minSpeed, fetchPositions]);

  const runAnalysis = async (mmsi: string) => {
    const group = grouped.find((g) => g.mmsi === mmsi);
    if (!group) return;
    setRows((r) => ({
      ...r,
      [mmsi]: { ...r[mmsi], analyzing: true, error: undefined },
    }));
    try {
      // fetch static info
      const res = await fetch(`/api/vessels/${mmsi}/static`);
      let staticInfo: unknown = undefined;
      if (res.ok) staticInfo = await res.json();
      // Narrow: expect object with numeric length or beam fields if present
      const typedStatic = ((): undefined | { [k: string]: unknown } => {
        if (staticInfo && typeof staticInfo === "object")
          return staticInfo as Record<string, unknown>;
        return undefined;
      })();
      const isStaticInfo = (v: unknown): v is VesselStaticInfo => {
        if (!v || typeof v !== "object") return false;
        const maybe = v as Record<string, unknown>;
        return typeof maybe.mmsi === "string";
      };
      const analyzed = analyzeVessel(
        mmsi,
        group.pos,
        isStaticInfo(typedStatic) ? typedStatic : undefined
      );
      const report = buildConsistencyReport(analyzed, []);
      setRows((r) => ({
        ...r,
        [mmsi]: { ...r[mmsi], analyzed, report, analyzing: false },
      }));
      setSelectedMmsi(mmsi);
    } catch (e) {
      setRows((r) => ({
        ...r,
        [mmsi]: {
          ...r[mmsi],
          analyzing: false,
          error: e instanceof Error ? e.message : "Analysis failed",
        },
      }));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded shadow p-4 flex flex-col gap-4">
        <div className="text-[10px] bg-amber-50 border border-amber-300 text-amber-800 px-2 py-1 rounded">
          Data source fixed to Vancouver; selecting another location only pans
          the map.
        </div>
        <div className="grid md:grid-cols-4 gap-4 mt-2">
          <div>
            <label
              htmlFor="vd-location"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Location
            </label>
            <select
              id="vd-location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
            >
              {arcticLocations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="vd-start"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Start (UTC)
            </label>
            <input
              id="vd-start"
              type="datetime-local"
              value={start.toISOString().slice(0, 16)}
              onChange={(e) => setStart(new Date(e.target.value))}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="vd-end"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              End (UTC)
            </label>
            <input
              id="vd-end"
              type="datetime-local"
              value={end.toISOString().slice(0, 16)}
              onChange={(e) => setEnd(new Date(e.target.value))}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="vd-min-speed"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Min Speed (kn)
            </label>
            <input
              id="vd-min-speed"
              type="number"
              step="0.1"
              value={minSpeed}
              onChange={(e) => setMinSpeed(parseFloat(e.target.value) || 0)}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="vd-pinned"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Pinned MMSIs
            </label>
            <input
              id="vd-pinned"
              type="text"
              value={pinnedInput}
              onChange={(e) => setPinnedInput(e.target.value)}
              placeholder="Comma or space separated"
              className="w-full border rounded px-2 py-1 text-sm"
            />
            <p className="mt-1 text-[10px] text-gray-500">
              Always shown (empty rows if no AIS in range).
            </p>
          </div>
        </div>
        <div>
          <button
            type="button"
            onClick={() =>
              location && fetchPositions({ locationId, start, end, minSpeed })
            }
            disabled={loading || !location}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-1 bg-white rounded shadow overflow-hidden flex flex-col max-h-[600px]">
          <div className="p-3 border-b flex items-center justify-between">
            <h3 className="font-semibold text-sm">
              Vessels ({grouped.length})
            </h3>
          </div>
          <div className="overflow-y-auto text-sm divide-y">
            {grouped.map((g) => {
              const state = rows[g.mmsi];
              const analyzed = state?.analyzed;
              const report = state?.report;
              const selected = selectedMmsi === g.mmsi;
              const isPinned = pinnedMmsis.includes(g.mmsi);
              return (
                <button
                  type="button"
                  key={g.mmsi}
                  className={`w-full text-left p-3 space-y-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    selected ? "bg-blue-50" : "hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    setSelectedMmsi((prev) => {
                      const next = prev === g.mmsi ? null : g.mmsi;
                      // If expanding and not analyzed yet, kick off analysis automatically
                      if (next && prev !== g.mmsi) {
                        const existing = rows[g.mmsi]?.analyzed;
                        if (!existing) void runAnalysis(g.mmsi);
                      }
                      return next;
                    });
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs flex items-center gap-2">
                      {g.mmsi}
                    </span>
                    <div className="flex items-center gap-2">
                      {report && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded ${
                            report.summary === "ALERT"
                              ? "bg-red-600 text-white"
                              : report.summary === "WARN"
                              ? "bg-yellow-500 text-white"
                              : "bg-green-600 text-white"
                          }`}
                        >
                          {report.summary}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void runAnalysis(g.mmsi);
                        }}
                        disabled={state?.analyzing}
                        className="text-xs px-2 py-1 rounded bg-slate-800 text-white disabled:opacity-50"
                      >
                        {state?.analyzing
                          ? "Analyzing..."
                          : analyzed
                          ? "Re-run"
                          : "Analyze"}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[10px] text-gray-600">
                    <span>
                      {g.pos.length} pts
                      {g.pos.length === 0 && isPinned && " (none)"}
                    </span>
                    {analyzed && (
                      <span>{analyzed.metrics.totalDistanceNm} nm</span>
                    )}
                    {analyzed && (
                      <span>{analyzed.metrics.avgSpeed} kn avg</span>
                    )}
                  </div>
                  {report && report.issues.length > 0 && (
                    <ul className="list-disc ml-4 text-[10px] text-gray-700 space-y-1">
                      {report.issues.slice(0, 3).map((i) => (
                        <li key={i.code + g.mmsi + i.message}>{i.code}</li>
                      ))}
                      {report.issues.length > 3 && (
                        <li>+{report.issues.length - 3} more</li>
                      )}
                    </ul>
                  )}
                  {state?.error && (
                    <div className="text-xs text-red-600">{state.error}</div>
                  )}
                  {selected && analyzed && (
                    <div className="mt-2 border-t pt-2 space-y-1">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                        <span>
                          <strong>Start:</strong>{" "}
                          {new Date(analyzed.metrics.startTime).toISOString()}
                        </span>
                        <span>
                          <strong>End:</strong>{" "}
                          {new Date(analyzed.metrics.endTime).toISOString()}
                        </span>
                        <span>
                          <strong>Duration:</strong>{" "}
                          {analyzed.metrics.durationHours.toFixed(2)} h
                        </span>
                        <span>
                          <strong>Distance:</strong>{" "}
                          {analyzed.metrics.totalDistanceNm} nm
                        </span>
                        <span>
                          <strong>Avg Speed:</strong>{" "}
                          {analyzed.metrics.avgSpeed} kn
                        </span>
                        <span>
                          <strong>Max Speed:</strong>{" "}
                          {analyzed.metrics.maxSpeed} kn
                        </span>
                        {analyzed.metrics.headingStdDev !== undefined && (
                          <span>
                            <strong>Heading σ:</strong>{" "}
                            {analyzed.metrics.headingStdDev}°
                          </span>
                        )}
                        <span>
                          <strong>Dwell Ratio:</strong>{" "}
                          {analyzed.metrics.dwellRatio}
                        </span>
                        <span>
                          <strong>Class:</strong> {analyzed.classification}
                        </span>
                        {analyzed.staticInfo?.shipType && (
                          <span>
                            <strong>Declared Type:</strong>{" "}
                            {analyzed.staticInfo.shipType}
                          </span>
                        )}
                      </div>
                      {report && (
                        <div className="mt-2 text-[10px]">
                          <div>
                            <strong>Consistency:</strong> {report.summary}
                          </div>
                          {report.issues.length ? (
                            <ul className="list-disc ml-5 mt-1 space-y-0.5">
                              {report.issues.map((issue) => (
                                <li
                                  key={issue.code + issue.message}
                                  className={
                                    issue.severity === "high"
                                      ? "text-red-600"
                                      : issue.severity === "medium"
                                      ? "text-yellow-600"
                                      : "text-gray-700"
                                  }
                                >
                                  {issue.code}: {issue.message}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-green-700">No issues.</div>
                          )}
                        </div>
                      )}
                      {analyzed.rationale && (
                        <div className="text-[10px] text-gray-600 italic">
                          {analyzed.rationale}
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
            {grouped.length === 0 && !loading && (
              <div className="p-4 text-xs text-gray-500">
                No vessels in selection.
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <MapView
            analyzed={analyzedList}
            focusLocationId={locationId}
            highlightMmsi={selectedMmsi || undefined}
            onSelectVessel={(m) => setSelectedMmsi(m)}
            pinnedMmsis={pinnedMmsis}
          />
        </div>
      </div>
    </div>
  );
}
