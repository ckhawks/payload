import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { files, users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { deleteFileAction } from "@/lib/actions/files";
import { formatBytes, formatDate } from "@/lib/format";
import { env } from "@/lib/env";
import { UploadForm } from "@/components/forms/upload-form";
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

export default async function FilesPage() {
  const user = await requireUser();

  const rows = await db
    .select({
      id: files.id,
      slug: files.slug,
      originalName: files.originalName,
      size: files.size,
      downloadCount: files.downloadCount,
      createdAt: files.createdAt,
      ownerName: users.username,
    })
    .from(files)
    .leftJoin(users, eq(files.ownerId, users.id))
    .where(user.isAdmin ? undefined : eq(files.ownerId, user.id))
    .orderBy(desc(files.createdAt));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Files</h1>
        <p className="text-muted-foreground text-sm">
          Uploads are stored privately in R2 and served from a direct link.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload</CardTitle>
        </CardHeader>
        <CardContent>
          <UploadForm />
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">No files yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Link</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead className="text-right">Downloads</TableHead>
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
                    <TableCell className="text-muted-foreground max-w-[16rem] truncate">
                      {row.originalName}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBytes(row.size)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.downloadCount}
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
                        action={deleteFileAction.bind(null, row.id)}
                        confirmLabel={`Delete /${row.slug}? This removes the file for good.`}
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
