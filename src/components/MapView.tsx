"use client";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Tooltip,
  Rectangle,
  LayerGroup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { AnalyzedVessel } from "../lib/types";
import type { DarkVesselAnomaly } from "../lib/dark-vessel";
import { arcticLocations } from "../lib/arctic-locations";
import { VesselClassification } from "../lib/types";
import type L from "leaflet";
import { useMemo } from "react";

const classificationColor: Record<string, string> = {
  [VesselClassification.STATIONARY]: "#f59e0b",
  [VesselClassification.ANCHORED]: "#6366f1",
  [VesselClassification.MANEUVERING]: "#ec4899",
  [VesselClassification.TRANSIT]: "#22c55e",
  [VesselClassification.UNKNOWN]: "#6b7280",
};

const anomalyColor: Record<string, string> = {
  NO_AIS_MATCH: "#dc2626",
  MMSI_MISMATCH: "#fb923c",
  AIS_GAP: "#eab308",
  UNUSUAL_BEHAVIOR: "#9333ea",
};
interface MapViewProps {
  analyzed: AnalyzedVessel[];
  anomalies?: DarkVesselAnomaly[];
  focusLocationId?: string;
  highlightMmsi?: string;
  onSelectVessel?: (mmsi: string) => void;
  pinnedMmsis?: string[];
}

export function MapView({
  analyzed,
  anomalies = [],
  focusLocationId,
  highlightMmsi,
  onSelectVessel,
  pinnedMmsis,
}: MapViewProps) {
  const focusBounds = useMemo(
    () => arcticLocations.find((l) => l.id === focusLocationId)?.bbox,
    [focusLocationId]
  );
  const center: [number, number] = focusBounds
    ? [
        (focusBounds.southwest.lat + focusBounds.northeast.lat) / 2,
        (focusBounds.southwest.lng + focusBounds.northeast.lng) / 2,
      ]
    : [70.0, -90.0];

  const bounds = focusBounds
    ? ([
        [focusBounds.southwest.lat, focusBounds.southwest.lng],
        [focusBounds.northeast.lat, focusBounds.northeast.lng],
      ] as L.LatLngBoundsExpression)
    : undefined;

  return (
    <div className="w-full h-[600px] relative rounded overflow-hidden border border-gray-700">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        bounds={bounds}
        preferCanvas
      >
        <TileLayer
          attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        <LayerGroup>
          {arcticLocations.map((loc) => (
            <Rectangle
              key={loc.id}
              bounds={[
                [loc.bbox.southwest.lat, loc.bbox.southwest.lng],
                [loc.bbox.northeast.lat, loc.bbox.northeast.lng],
              ]}
              pathOptions={{
                color: loc.id === focusLocationId ? "#38bdf8" : "#475569",
                weight: 1,
                dashArray: "4 4",
              }}
            >
              <Tooltip>{loc.name}</Tooltip>
            </Rectangle>
          ))}
        </LayerGroup>

        {analyzed.map((v) => {
          const line: [number, number][] = v.positions.map((p) => [
            p.latitude,
            p.longitude,
          ]);
          const isHighlighted = highlightMmsi === v.mmsi;
          const isPinned = pinnedMmsis?.includes(v.mmsi);
          const last = v.positions[v.positions.length - 1];
          const dimmed = !isHighlighted && !isPinned;
          return (
            <LayerGroup key={v.mmsi}>
              {line.length > 1 && (
                <Polyline
                  positions={line}
                  pathOptions={{
                    color: classificationColor[v.classification],
                    weight: isHighlighted ? 4 : isPinned ? 2 : 1,
                    opacity: isHighlighted ? 0.85 : isPinned ? 0.5 : 0.15,
                  }}
                  eventHandlers={
                    onSelectVessel
                      ? { click: () => onSelectVessel(v.mmsi) }
                      : undefined
                  }
                />
              )}
              {last && (
                <CircleMarker
                  center={[last.latitude, last.longitude]}
                  radius={isHighlighted ? 8 : isPinned ? 6 : 4}
                  pathOptions={{
                    color: isHighlighted
                      ? "#ffffff"
                      : classificationColor[v.classification],
                    weight: isHighlighted ? 3 : isPinned ? 2 : 1,
                    fillColor: classificationColor[v.classification],
                    fillOpacity: isHighlighted ? 0.95 : isPinned ? 0.8 : 0.35,
                  }}
                  eventHandlers={
                    onSelectVessel
                      ? { click: () => onSelectVessel(v.mmsi) }
                      : undefined
                  }
                >
                  <Tooltip>
                    {(() => {
                      const hasAnomaly = anomalies.some(
                        (a) =>
                          a.mmsi === v.mmsi ||
                          (a.detection && a.detection.mmsi === v.mmsi)
                      );
                      const isDark =
                        hasAnomaly ||
                        (!v.staticInfo &&
                          v.classification === VesselClassification.UNKNOWN);
                      const img = isDark
                        ? "/thumb-dark.svg"
                        : "/thumb-legit.svg";
                      return (
                        <div className="w-56">
                          <div
                            className="w-full h-24 rounded mb-2 border bg-center bg-cover"
                            style={{
                              backgroundImage: `url(${img})`,
                              filter: dimmed
                                ? "grayscale(0.7) opacity(0.85)"
                                : undefined,
                            }}
                            role="img"
                            aria-label={
                              isDark
                                ? "Dark vessel thumbnail"
                                : "Legit vessel thumbnail"
                            }
                          />
                          <div className="text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono">{v.mmsi}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  isDark
                                    ? "bg-red-600 text-white"
                                    : "bg-green-600 text-white"
                                }`}
                              >
                                {isDark ? "DARK" : "LEGIT"}
                              </span>
                            </div>
                            {v.staticInfo?.name && (
                              <div>
                                <strong>Name:</strong> {v.staticInfo.name}
                              </div>
                            )}
                            {v.staticInfo?.shipType && (
                              <div>
                                <strong>Type:</strong> {v.staticInfo.shipType}
                              </div>
                            )}
                            <div>
                              <strong>Class:</strong> {v.classification}
                            </div>
                            <div>
                              <strong>Last:</strong>{" "}
                              {new Date(last.timestamp).toISOString()}
                            </div>
                            <div className="flex gap-2">
                              <span>
                                <strong>Spd:</strong> {last.speed.toFixed(1)} kn
                              </span>
                              {v.metrics && (
                                <span>
                                  <strong>Dist:</strong>{" "}
                                  {v.metrics.totalDistanceNm} nm
                                </span>
                              )}
                            </div>
                            {hasAnomaly && (
                              <div className="text-red-600 font-semibold">
                                Anomaly Detected
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </Tooltip>
                </CircleMarker>
              )}
            </LayerGroup>
          );
        })}

        <LayerGroup>
          {anomalies.map((a) => {
            const key = a.detection
              ? `${a.type}-${a.detection.timestamp}`
              : `${a.type}-${a.mmsi}`;
            const anomalyMmsi = a.mmsi || a.detection?.mmsi;
            const pinned = anomalyMmsi && pinnedMmsis?.includes(anomalyMmsi);
            return a.detection ? (
              <CircleMarker
                key={key}
                center={[a.detection.latitude, a.detection.longitude]}
                radius={pinned ? 7 : 5}
                pathOptions={{
                  color: anomalyColor[a.type] || "#fff",
                  weight: pinned ? 3 : 1.5,
                  fillOpacity: pinned ? 0.5 : 0.25,
                }}
              >
                <Tooltip>
                  <div className="text-xs">
                    <div>
                      <strong>Anomaly:</strong> {a.type}
                    </div>
                    <div>{a.description}</div>
                    {a.detection.inferredType && (
                      <div>
                        <strong>Inferred:</strong> {a.detection.inferredType}
                      </div>
                    )}
                    {a.detection.source && (
                      <div>
                        <strong>Source:</strong> {a.detection.source}
                      </div>
                    )}
                    {a.detection.confidence !== undefined && (
                      <div>
                        <strong>Conf:</strong>{" "}
                        {(a.detection.confidence * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                </Tooltip>
              </CircleMarker>
            ) : null;
          })}
        </LayerGroup>
      </MapContainer>
    </div>
  );
}
// End of component
