import { NextResponse } from 'next/server';
import { aisApiClient } from '../../../../lib/ais-client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bbox, start, end, minSpeed = 0 } = body || {};
    if (!bbox || !start || !end) {
      return NextResponse.json({ error: 'Missing bbox, start or end' }, { status: 400 });
    }
    const data = await aisApiClient.getVesselPositions({ bbox, start, end, minSpeed });
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
