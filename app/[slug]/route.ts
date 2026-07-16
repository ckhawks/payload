import { NextResponse, type NextRequest } from "next/server";
import { Readable } from "node:stream";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { files, links } from "@/lib/db/schema";
import { resolveBareSlug } from "@/lib/db/lookup";
import { getObjectStream } from "@/lib/storage/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);

  const resource = await resolveBareSlug(decoded);
  if (!resource) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (resource.kind === "link") {
    void db
      .update(links)
      .set({ clickCount: sql`${links.clickCount} + 1` })
      .where(sql`${links.id} = ${resource.row.id}`);
    return NextResponse.redirect(resource.row.targetUrl, 302);
  }

  // File: stream the bytes straight from R2 under the clean domain.
  const file = resource.row;
  let object;
  try {
    object = await getObjectStream(file.storageKey);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  void db
    .update(files)
    .set({ downloadCount: sql`${files.downloadCount} + 1` })
    .where(sql`${files.id} = ${file.id}`);

  const webStream = Readable.toWeb(object.body) as ReadableStream<Uint8Array>;
  const headers = new Headers();
  headers.set("Content-Type", object.contentType ?? file.contentType);
  if (object.contentLength != null) {
    headers.set("Content-Length", String(object.contentLength));
  }
  // Render inline where the browser can; fall back to the original filename.
  headers.set(
    "Content-Disposition",
    `inline; filename="${encodeURIComponent(file.originalName)}"`,
  );
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new NextResponse(webStream, { status: 200, headers });
}
