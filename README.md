This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Dark Vessel Surveillance (Hackathon Prototype)

This prototype focuses on Canadian Arctic maritime situational awareness: detecting potential "dark" vessels (those operating without AIS or with anomalous patterns) in sovereignty-critical corridors (Northwest Passage chokepoints, Beaufort Shelf, Hudson Strait, etc.).

### Key Features

- AIS Position Ingestion: Normalizes polymorphic AIS API responses (array or object forms) via `ais-client.ts`.
- Static Vessel Info: Best-effort enrichment through `getVesselStaticInfo` (placeholder—adapt endpoint as needed).
- Movement Analysis: Metrics (distance, dwell ratio, speed variance) for behavioral classification.
- External Sensor Stub: `classification-client.ts` integrates a hypothetical multi-sensor classification API returning non‑AIS detections.
- Dark Vessel Heuristics: `dark-vessel.ts` flags sensor detections lacking AIS correlation and sparse AIS tracks.
- Arctic Priority Zones: Granular chokepoint polygons (Lancaster Sound, Peel Sound, Victoria Strait, etc.) in `arctic-locations.ts`.
- Interactive Map: Leaflet-based `MapView` overlays AIS tracks, classifications, anomalies, and priority zone rectangles.

### Pages

- `/dark-vessels` – Demonstration page combining AIS fetch, external classification stub, anomaly detection, and a map.

### Data Flow

1. User loads `/dark-vessels`.
2. Server components fetch AIS positions for a chosen zone + time window.
3. Positions grouped by MMSI; movement metrics + behavioral classification computed.
4. External classification API stub returns synthetic (or real, if wired) detections.
5. Anomaly engine cross-compares AIS vs external detections.
6. Map renders: tracks (colored by class) + anomaly markers + zone overlays.

### Classification Legend

| Classification | Color | Heuristic (simplified) |
|----------------|-------|------------------------|
| TRANSIT        | Green | Sustained distance & speed |
| STATIONARY     | Amber | Minimal movement + very low avg speed |
| ANCHORED       | Indigo | Low speed + high dwell + limited drift |
| MANEUVERING    | Pink  | High heading variability |
| UNKNOWN        | Gray  | Insufficient or ambiguous data |

### Anomaly Types

- `NO_AIS_MATCH`: External detection with no spatial-temporal AIS correlation (potential dark vessel).
- `AIS_GAP`: Single AIS point in window (possible intermittent emission or spoof).
- Future (placeholders): `MMSI_MISMATCH`, `UNUSUAL_BEHAVIOR` (add advanced analytics later).

### Setup & Environment Variables

Create a `.env.local` if needed:

```
NEXT_PUBLIC_CLASSIFICATION_API_BASE=https://your-external-sensor-api.example
```

Install dependencies (after pulling this branch):

```bash
npm install
npm run dev
```

Then open: `http://localhost:3000/dark-vessels`.

### File Overview

- `src/lib/ais-client.ts` – AIS API interaction & normalization.
- `src/lib/types.ts` – Shared domain types (positions, static info, metrics, classification).
- `src/lib/analysis.ts` – Movement metrics + classification heuristics.
- `src/lib/classification-client.ts` – External detection API stub.
- `src/lib/dark-vessel.ts` – Dark vessel anomaly detection logic.
- `src/lib/arctic-locations.ts` – Priority surveillance zone registry.
- `src/components/MapView.tsx` – Leaflet visualization.
- `src/app/dark-vessels/page.tsx` – Demo assembly page.

### Extending the Prototype

Potential enhancements (not yet implemented):

- WebSocket / SSE real-time AIS updates.
- Temporal heatmaps (loitering hotspots) per zone.
- ML-based anomaly scoring integrating speed / course residuals.
- SAR / RF ingestion adapter translating detections into the external classification schema.
- MMSI identity drift detection (flag abrupt type/length/flag changes).
- Spatial indexing (R-tree) for faster correlation at scale.

### Limitations

- External classification endpoint is a stub; integrate real sensor fusion backend.
- Static vessel info call uses heuristic field mapping; refine with authoritative schema.
- Anomaly logic intentionally simple; expand with statistical baselines & domain intelligence.
- No persistence layer (pure in-memory processing per request).

### Contributing

1. Fork / branch
2. Implement feature
3. Ensure lint passes: `npm run lint`
4. Submit PR with description & sample output screenshot.

### License

Internal hackathon prototype – clarify licensing before external distribution.

---

For general Next.js documentation see:
- https://nextjs.org/docs
- https://nextjs.org/learn

Deployment guidance: https://nextjs.org/docs/app/building-your-application/deploying
