import { NextResponse, type NextRequest } from "next/server";
import { getUserByApiToken } from "@/lib/auth/token";
import { storeUpload } from "@/lib/files/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Headless upload endpoint for ShareX / curl / CLI.
 *
 *   curl -F "file=@photo.png" \
 *        -H "Authorization: Bearer payload_xxx" \
 *        https://payload.stlr.cx/api/upload
 *
 * Optional field `name` sets a custom slug. Responds { url }.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ")
    ? auth.slice(7).trim()
    : (req.headers.get("x-api-key")?.trim() ?? "");

  if (!token) {
    return NextResponse.json({ error: "Missing API token." }, { status: 401 });
  }

  const user = await getUserByApiToken(token);
  if (!user) {
    return NextResponse.json({ error: "Invalid API token." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No file provided in the `file` field." },
      { status: 400 },
    );
  }

  const result = await storeUpload({
    file,
    customSlug: String(form.get("name") ?? ""),
    ownerId: user.id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Return several key names so different clients (ShareX, etc.) can find the URL.
  return NextResponse.json({
    url: result.url,
    link: result.url,
    slug: result.slug,
  });
}
