import { NextResponse } from 'next/server';
import { aisApiClient } from '../../../../../lib/ais-client';

export async function GET(_request: Request, context: { params: { mmsi: string } }) {
  const { mmsi } = context.params;
  if (!mmsi) return NextResponse.json({ error: 'Missing MMSI' }, { status: 400 });
  try {
    const info = await aisApiClient.getVesselStaticInfo(mmsi, new Date());
    if (!info) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(info);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
