import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { gists, users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { deleteGistAction } from "@/lib/actions/gists";
import { formatDate } from "@/lib/format";
import { env } from "@/lib/env";
import { GistForm } from "@/components/forms/gist-form";
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

export default async function GistsPage() {
  const user = await requireUser();

  const rows = await db
    .select({
      id: gists.id,
      slug: gists.slug,
      title: gists.title,
      language: gists.language,
      viewCount: gists.viewCount,
      createdAt: gists.createdAt,
      ownerName: users.username,
    })
    .from(gists)
    .leftJoin(users, eq(gists.ownerId, users.id))
    .where(user.isAdmin ? undefined : eq(gists.ownerId, user.id))
    .orderBy(desc(gists.createdAt));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Gists</h1>
        <p className="text-muted-foreground text-sm">
          Share a snippet of code or text at a clean URL.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New gist</CardTitle>
        </CardHeader>
        <CardContent>
          <GistForm />
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">No gists yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Link</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Lang</TableHead>
                <TableHead className="text-right">Views</TableHead>
                {user.isAdmin && <TableHead>Owner</TableHead>}
                <TableHead>Added</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const url = `${env.APP_URL}/g/${row.slug}`;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono">
                      <div className="flex items-center gap-2">
                        <a
                          href={`/g/${row.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline"
                        >
                          /g/{row.slug}
                        </a>
                        <CopyButton value={url} label="" />
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[16rem] truncate">
                      {row.title ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.language ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.viewCount}
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
                        action={deleteGistAction.bind(null, row.id)}
                        confirmLabel={`Delete /g/${row.slug}?`}
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
