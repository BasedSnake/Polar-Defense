import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// NOTE: Writing to the filesystem only works in a Node.js runtime with writable
// ephemeral storage (e.g. Vercel Edge/File writes won't persist between builds).
// For a production persistent solution you'd stream to object storage (S3, etc.).

export async function POST(
  req: NextRequest,
  { params }: { params: { mmsi: string } }
) {
  try {
    const mmsi = params.mmsi;
    if (!/^[0-9]{7,9}$/.test(mmsi)) {
      return new Response(JSON.stringify({ error: "Invalid MMSI" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const body = await req.json();
    // Expect a minimal shape but store whatever was supplied
    const outDir = path.join(process.cwd(), "public", "reports");
    await fs.mkdir(outDir, { recursive: true });
    const filePath = path.join(outDir, `${mmsi}-report.json`);
    await fs.writeFile(filePath, JSON.stringify(body, null, 2), "utf8");
    const publicPath = `/reports/${mmsi}-report.json`;
    return new Response(
      JSON.stringify({ ok: true, path: publicPath }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message || "Failed to store report" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
