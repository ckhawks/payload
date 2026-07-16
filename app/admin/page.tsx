import Link from "next/link";
import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { files, links, gists } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { formatBytes } from "@/lib/format";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

async function countFor(userId: string, isAdmin: boolean) {
  const scope = (col: ReturnType<typeof eq>) => (isAdmin ? undefined : col);
  const [f] = await db
    .select({
      n: sql<number>`count(*)::int`,
      bytes: sql<number>`coalesce(sum(${files.size}), 0)::bigint`,
    })
    .from(files)
    .where(scope(eq(files.ownerId, userId)));
  const [l] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(links)
    .where(scope(eq(links.ownerId, userId)));
  const [g] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(gists)
    .where(scope(eq(gists.ownerId, userId)));
  return {
    files: f.n,
    bytes: Number(f.bytes),
    links: l.n,
    gists: g.n,
  };
}

export default async function AdminHome() {
  const user = await requireUser();
  const stats = await countFor(user.id, user.isAdmin);

  const cards = [
    { label: "Files", value: stats.files, href: "/admin/files" },
    { label: "Links", value: stats.links, href: "/admin/links" },
    { label: "Gists", value: stats.gists, href: "/admin/gists" },
    { label: "Storage used", value: formatBytes(stats.bytes), href: "/admin/files" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <p className="text-muted-foreground text-sm">
          {user.isAdmin ? "All activity across accounts." : "Your activity."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href}>
            <Card className="transition-colors hover:border-foreground/20">
              <CardHeader>
                <CardDescription className="mono-label">
                  {c.label}
                </CardDescription>
                <CardTitle className="text-2xl tabular-nums">
                  {c.value}
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <QuickCard
          href="/admin/files"
          title="Upload a file"
          desc="Store in R2, get a direct link."
        />
        <QuickCard
          href="/admin/links"
          title="Shorten a link"
          desc="Turn any URL into a short slug."
        />
        <QuickCard
          href="/admin/gists"
          title="Create a gist"
          desc="Share a code or text snippet."
        />
      </div>
    </div>
  );
}

function QuickCard({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition-colors hover:border-foreground/20">
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{desc}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
