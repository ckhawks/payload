import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { fileRequests } from "@/lib/db/schema";
import { requestStatus } from "@/lib/file-requests";
import { formatBytes, formatDateTime } from "@/lib/format";
import { env } from "@/lib/env";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { RequestUploadForm } from "@/components/forms/request-upload-form";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

async function getRequest(slug: string) {
  const [row] = await db
    .select()
    .from(fileRequests)
    .where(eq(fileRequests.slug, decodeURIComponent(slug)))
    .limit(1);
  return row ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const row = await getRequest(slug);
  return { title: row?.title ? `${row.title} · payload` : "Upload · payload" };
}

const CLOSED_COPY: Record<string, string> = {
  expired: "This upload link has expired and is no longer accepting files.",
  closed: "This upload link is closed and is no longer accepting files.",
  full: "This upload link has reached its limit and is no longer accepting files.",
};

export default async function RequestPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const row = await getRequest(slug);
  if (!row) notFound();

  const status = requestStatus(row);
  const open = status === "open";

  const remainingFiles =
    row.maxUploads != null ? Math.max(0, row.maxUploads - row.uploadCount) : null;

  const limits: string[] = [];
  if (row.maxUploads != null) {
    limits.push(
      `${remainingFiles} of ${row.maxUploads} file${row.maxUploads === 1 ? "" : "s"} left`,
    );
  }
  if (row.maxBytes != null) {
    limits.push(`${formatBytes(row.maxBytes)} total limit`);
  }
  if (row.closeAfterFirst) {
    limits.push("closes after the first upload");
  }

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <ThemeToggle className="fixed top-4 right-4" />
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Brand />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {row.title ?? "Send me a file"}
            </CardTitle>
            {row.note && (
              <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                {row.note}
              </p>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {open ? (
              <>
                <RequestUploadForm slug={row.slug} />
                <div className="text-muted-foreground border-t pt-3 text-xs">
                  <p>Open until {formatDateTime(row.expiresAt)}.</p>
                  {limits.length > 0 && <p className="mt-0.5">{limits.join(" · ")}.</p>}
                  <p className="mt-0.5">
                    Files up to {formatBytes(env.MAX_UPLOAD_BYTES)} each.
                  </p>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                {CLOSED_COPY[status] ?? CLOSED_COPY.closed}
              </p>
            )}
          </CardContent>
        </Card>

        <p className="text-muted-foreground mt-6 flex items-center justify-center gap-1.5 text-xs">
          Made by
          <a
            href="https://stellaric.pw"
            target="_blank"
            rel="noreferrer"
            className="border-border text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors"
          >
            <svg
              viewBox="0 0 1024 1024"
              fill="currentColor"
              aria-hidden="true"
              className="size-4"
            >
              <path d="M203 641.88H381.8C381.8 713.68 440 771.92 511.84 771.92V950.72C341.28 950.72 203 812.44 203 641.88Z" />
              <path d="M511.84 601.24C341.28 601.24 203 462.96 203 292.4H381.8C381.8 364.2 440 422.44 511.84 422.44C682.4 422.44 820.68 560.72 820.68 731.28H641.88C641.88 659.48 583.68 601.24 511.84 601.24Z" />
              <path d="M820.68 381.8H641.88C641.88 310 583.68 251.76 511.84 251.76V73C682.387 73 820.658 211.258 820.68 381.8Z" />
            </svg>
            <span className="font-medium">Stellaric</span>
          </a>
        </p>
      </div>
    </main>
  );
}
