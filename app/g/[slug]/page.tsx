import { notFound } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { gists } from "@/lib/db/schema";
import { highlight } from "@/lib/highlight";
import { CopyButton } from "@/components/copy-button";

export const dynamic = "force-dynamic";

export default async function GistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [gist] = await db
    .select()
    .from(gists)
    .where(eq(gists.slug, slug))
    .limit(1);

  if (!gist) notFound();

  void db
    .update(gists)
    .set({ viewCount: sql`${gists.viewCount} + 1` })
    .where(eq(gists.id, gist.id));

  const html = await highlight(gist.content, gist.language);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate font-mono text-lg font-medium">
            {gist.title ?? gist.slug}
          </h1>
          {gist.language && (
            <p className="text-muted-foreground text-sm">{gist.language}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={`/g/${gist.slug}/raw`}
            className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4"
          >
            raw
          </a>
          <CopyButton value={gist.content} />
        </div>
      </div>

      <div
        className="gist-code overflow-x-auto rounded-lg border text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <p className="text-muted-foreground mt-3 text-xs">
        {gist.viewCount + 1} views
      </p>
    </main>
  );
}
