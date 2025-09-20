import { Suspense } from "react";
import { aisApiClient } from "../../lib/ais-client";
import { externalClassificationClient } from "../../lib/classification-client";
import { groupPositionsByMMSI, analyzeVessel } from "../../lib/analysis";
import { detectDarkVessels } from "../../lib/dark-vessel";
import { MapView } from "../../components/MapView";
import { arcticLocations } from "../../lib/arctic-locations";

async function fetchData() {
  // For demo: use Lancaster Sound window past 6 hours
  const location = arcticLocations.find((l) => l.id === "lancaster-sound");
  const end = new Date();
  const start = new Date(end.getTime() - 6 * 3600 * 1000);
  if (!location) return { analyzed: [], anomalies: [] };
  const bbox = `${location.bbox.southwest.lng},${location.bbox.southwest.lat},${location.bbox.northeast.lng},${location.bbox.northeast.lat}`;
  const ais = await aisApiClient.getVesselPositions({
    bbox,
    start: aisApiClient.formatDateForAPI(start),
    end: aisApiClient.formatDateForAPI(end),
    minSpeed: 0,
  });
  const groups = groupPositionsByMMSI(ais.positions);
  const analyzed = groups.map((g) => analyzeVessel(g.mmsi, g.positions));

  // External classification stub call
  const ext = await externalClassificationClient.classifyDetections({
    bbox: location.bbox,
    start: start.toISOString(),
    end: end.toISOString(),
  });

  const anomalies = detectDarkVessels(ais.positions, ext.detections);
  return { analyzed, anomalies };
}

export default async function DarkVesselsPage() {
  const data = await fetchData();
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">
        Dark Vessel Surveillance (Demo)
      </h1>
      <p className="text-sm text-gray-400 max-w-2xl">
        Experimental integration combining AIS tracks with external sensor
        classification to highlight potential dark or anomalous vessels in
        Arctic chokepoints.
      </p>
      <Suspense fallback={<div>Loading map...</div>}>
        <MapView
          analyzed={data.analyzed}
          anomalies={data.anomalies}
          focusLocationId="lancaster-sound"
        />
      </Suspense>
      <div className="text-xs text-gray-500">
        Note: External classification API results are stubbed. Replace endpoint
        & schema in <code>classification-client.ts</code>.
      </div>
    </div>
  );
}
