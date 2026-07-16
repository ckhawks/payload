import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { links, users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { deleteLinkAction } from "@/lib/actions/links";
import { formatDate } from "@/lib/format";
import { env } from "@/lib/env";
import { LinkForm } from "@/components/forms/link-form";
import { CopyButton } from "@/components/copy-button";
import { DeleteButton } from "@/components/delete-button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function LinksPage() {
  const user = await requireUser();

  const rows = await db
    .select({
      id: links.id,
      slug: links.slug,
      targetUrl: links.targetUrl,
      clickCount: links.clickCount,
      createdAt: links.createdAt,
      ownerName: users.username,
    })
    .from(links)
    .leftJoin(users, eq(links.ownerId, users.id))
    .where(user.isAdmin ? undefined : eq(links.ownerId, user.id))
    .orderBy(desc(links.createdAt));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Links</h1>
        <p className="text-muted-foreground text-sm">
          Shorten any URL into a slug on your domain.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New short link</CardTitle>
        </CardHeader>
        <CardContent>
          <LinkForm />
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">No links yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Short</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                {user.isAdmin && <TableHead>Owner</TableHead>}
                <TableHead>Added</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const url = `${env.APP_URL}/${row.slug}`;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono">
                      <div className="flex items-center gap-2">
                        <a
                          href={`/${row.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline"
                        >
                          /{row.slug}
                        </a>
                        <CopyButton value={url} label="" />
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[20rem] truncate">
                      {row.targetUrl}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.clickCount}
                    </TableCell>
                    {user.isAdmin && (
                      <TableCell className="text-muted-foreground">
                        {row.ownerName}
                      </TableCell>
                    )}
                    <TableCell className="text-muted-foreground">
                      {formatDate(row.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DeleteButton
                        action={deleteLinkAction.bind(null, row.id)}
                        confirmLabel={`Delete /${row.slug}?`}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
