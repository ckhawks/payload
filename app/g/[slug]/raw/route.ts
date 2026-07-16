import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { gists } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const [gist] = await db
    .select({ content: gists.content })
    .from(gists)
    .where(eq(gists.slug, slug))
    .limit(1);

  if (!gist) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(gist.content, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
