import type { AISQueryParams, AISResponse, VesselPosition, VesselStaticInfo } from './types';

class AISApiClient {
  private readonly baseUrl = 'https://kystdatahuset.no/ws/api/ais';

  private getDefaultHeaders(): Record<string, string> {
    return {
      'Accept-Language': 'en-US,en;q=0.9',
      'Connection': 'keep-alive',
      'Content-Type': 'application/json',
      'Origin': 'https://kystdatahuset.no',
      'Referer': 'https://kystdatahuset.no/ws/swagger/index.html',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      'accept': 'text/plain',
      'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"'
    };
  }

  /**
   * Fetch static vessel info (statistical AIS static message snapshot) for one MMSI at (or near) a timestamp window.
   * The underlying API path (per provided spec) is assumed to be:
   *   GET /api/ais/statinfo/for-mmsis-time?mmsis={mmsi}&time={YYYYMMDDHHMM}
   * Some deployments might accept POST with body; adapt if needed.
   * We keep it simple and attempt GET; caller must supply a JS Date or preformatted time.
   */
  async getVesselStaticInfo(mmsi: string, at: Date): Promise<VesselStaticInfo | null> {
    const timeParam = this.formatDateForAPI(at);
    const url = `${this.baseUrl.replace(/\/ais$/, '')}/ais/statinfo/for-mmsis-time?mmsis=${encodeURIComponent(mmsi)}&time=${encodeURIComponent(timeParam)}`;
    try {
      const response = await fetch(url, { headers: this.getDefaultHeaders() });
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Static info request failed: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      // Response could be an object or array; normalize best-effort.
      const record = Array.isArray(data) ? data[0] : data;
      if (!record || typeof record !== 'object') return null;
      const r = record as Record<string, unknown>;
      const result: VesselStaticInfo = {
        mmsi: String(r.mmsi ?? r.MMSI ?? mmsi),
        name: (r.name ?? r.shipname ?? r.ShipName ?? r.vesselName) as string | undefined,
        callsign: (r.callsign ?? r.CallSign ?? r.call_sign) as string | undefined,
        imo: 'imo' in r && r.imo ? Number(r.imo) : 'IMO' in r && r.IMO ? Number(r.IMO) : undefined,
        shipType: (r.shipTypeText ?? r.shipTypeDesc ?? r.shiptype_text ?? r.shiptype ?? r.type) as string | undefined,
        shipTypeCode: (r.shipType as number | undefined) ?? (r.shiptype_code as number | undefined) ?? (typeof r.type === 'number' ? (r.type as number) : undefined),
        length: (r.length as number | undefined) ?? (r.Length as number | undefined) ?? (r.dimension_to_bow && r.dimension_to_stern ? (Number(r.dimension_to_bow) + Number(r.dimension_to_stern)) : undefined),
        beam: (r.beam as number | undefined) ?? (r.Beam as number | undefined) ?? (r.dimension_to_port && r.dimension_to_starboard ? (Number(r.dimension_to_port) + Number(r.dimension_to_starboard)) : undefined),
        draught: (r.draught as number | undefined) ?? (r.Draught as number | undefined) ?? ('draft' in r && r.draft ? Number(r.draft) : undefined),
        flag: (r.flag ?? r.Flag ?? r.country ?? r.Country) as string | undefined,
        destination: (r.destination ?? r.Destination) as string | undefined,
        eta: (r.eta ?? r.ETA) as string | undefined,
        aisClass: (r.class ?? r.aisClass ?? (r.Class ? String(r.Class) : undefined)) as 'A' | 'B' | undefined,
        statTimestamp: r.timestamp ? (typeof r.timestamp === 'string' ? (r.timestamp as string) : new Date(Number(r.timestamp)).toISOString()) : undefined,
        _raw: record
      };
      return result;
    } catch (err) {
      console.error('[AIS] getVesselStaticInfo error', err);
      return null; // degrade gracefully
    }
  }

  /**
   * Optional helper to fetch many static infos sequentially (simple implementation to avoid rate limits).
   */
  async getManyVesselStaticInfo(mmsis: string[], at: Date): Promise<Record<string, VesselStaticInfo>> {
    const out: Record<string, VesselStaticInfo> = {};
    for (const m of mmsis) {
      const info = await this.getVesselStaticInfo(m, at);
      if (info) out[m] = info;
    }
    return out;
  }

  async getVesselPositions(params: AISQueryParams): Promise<AISResponse> {
    const { minSpeed } = params;
    try {
      const response = await fetch(`${this.baseUrl}/positions/within-bbox-time`, {
        method: 'POST',
        headers: this.getDefaultHeaders(),
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error(`AIS API request failed: ${response.status} ${response.statusText}`);
      }

      const rawText = await response.text();
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[AIS] Raw response text length:', rawText.length);
      }

      let jsonData: unknown;
      try {
        jsonData = JSON.parse(rawText);
      } catch (parseError) {
        console.warn('[AIS] Failed to parse response as JSON. Returning empty array.', parseError);
        return { positions: [], count: 0 };
      }

      // Determine where the positions array lives.
      let rawPositions: unknown[] = [];
      if (Array.isArray(jsonData)) {
        rawPositions = jsonData as unknown[];
      } else if (typeof jsonData === 'object' && jsonData !== null) {
        const obj = jsonData as Record<string, unknown>;
        if (Array.isArray(obj.positions)) rawPositions = obj.positions;
        else if (Array.isArray(obj.data)) rawPositions = obj.data;
        else if (Array.isArray(obj.results)) rawPositions = obj.results;
        else {
          const potentialArray = Object.values(obj).find(v => Array.isArray(v));
          if (Array.isArray(potentialArray)) rawPositions = potentialArray;
        }
      }

      if (process.env.NODE_ENV !== 'production') {
        console.debug('[AIS] Detected raw positions count before normalization:', rawPositions.length);
      }

      const normalize = (p: unknown): VesselPosition | null => {
        // New: handle compact array format like
        // [mmsi, timestamp, lon, lat, course, speed, navStatus?, sog2?, val8?, heading?]
        if (Array.isArray(p)) {
          // Guard for minimum required length
          // Index assumptions based on sample provided by user
          if (p.length < 6) return null;
          const [mmsiRaw, tsRaw, lonRaw, latRaw, courseOrHeading, speedRaw, , , , headingMaybe] = p as unknown[];
          if (mmsiRaw == null || tsRaw == null || latRaw == null || lonRaw == null) return null;
          const speedNum = typeof speedRaw === 'number' ? speedRaw : typeof speedRaw === 'string' ? parseFloat(speedRaw) : 0;
          const heading = (typeof headingMaybe === 'number' ? headingMaybe : typeof courseOrHeading === 'number' ? courseOrHeading : undefined) as number | undefined;
          return {
            mmsi: String(mmsiRaw),
            timestamp: typeof tsRaw === 'string' ? tsRaw : new Date(Number(tsRaw)).toISOString(),
            latitude: Number(latRaw),
            longitude: Number(lonRaw),
            speed: Number.isNaN(speedNum) ? 0 : speedNum,
            heading
          };
        }

        if (typeof p !== 'object' || p === null) return null;
        const rec = p as Record<string, unknown>;
        // Extract or infer fields with fallbacks (object format)
        const latitude = rec.latitude ?? rec.lat ?? rec.Latitude ?? rec.Lat;
        const longitude = rec.longitude ?? rec.lon ?? rec.lng ?? rec.Longitude ?? rec.Lon;
        const speedRaw = rec.speed ?? rec.sog ?? rec.SOG ?? rec.Speed ?? rec.speedOverGround;
        const timestamp = rec.timestamp ?? rec.time ?? rec.Time ?? rec.lastUpdate ?? rec.last_report ?? rec.ts;
        const idField = rec.mmsi ?? rec.MMSI ?? rec.imo ?? rec.IMO;
        const mmsi = idField != null ? String(idField) : undefined;
        if (latitude == null || longitude == null || mmsi == null || timestamp == null) {
          return null; // skip malformed
        }
        const speed = typeof speedRaw === 'number' ? speedRaw : typeof speedRaw === 'string' ? parseFloat(speedRaw) : 0;
        return {
          mmsi,
          latitude: Number(latitude),
          longitude: Number(longitude),
          speed: Number.isNaN(speed) ? 0 : speed,
          timestamp: typeof timestamp === 'string' ? timestamp : new Date(Number(timestamp)).toISOString(),
          vesselName: (rec.vesselName ?? rec.name ?? rec.shipname ?? rec.ShipName ?? rec.NAME) as string | undefined,
          heading: (rec.heading ?? rec.cog ?? rec.COG ?? rec.headingTrue ?? rec.HDG) as number | undefined,
          vesselType: (rec.vesselType ?? rec.type ?? rec.shiptype ?? rec.TYPE) as string | undefined
        };
      };

      const normalized: VesselPosition[] = rawPositions
        .map(normalize)
        .filter((p: VesselPosition | null): p is VesselPosition => p !== null);

      // Apply speed filter client-side as a fallback if server does not filter.
      const speedFiltered = normalized.filter(p => p.speed >= minSpeed);

      if (process.env.NODE_ENV !== 'production') {
        console.debug('[AIS] Normalized positions:', normalized.length, 'After speed filter:', speedFiltered.length);
        if (speedFiltered.length > 0) {
          console.debug('[AIS] First item sample:', speedFiltered[0]);
        }
      }

      return { positions: speedFiltered, count: speedFiltered.length };
    } catch (error) {
      console.error('AIS API request failed:', error);
      throw error;
    }
  }

  /**
   * Formats a date for the AIS API (YYYYMMDDHHMM format)
   */
  formatDateForAPI(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}${month}${day}${hours}${minutes}`;
  }

  /**
   * Formats a bounding box for the AIS API
   */
  formatBoundingBox(southwest: { lat: number; lng: number }, northeast: { lat: number; lng: number }): string {
    return `${southwest.lng},${southwest.lat},${northeast.lng},${northeast.lat}`;
  }
}

export const aisApiClient = new AISApiClient();