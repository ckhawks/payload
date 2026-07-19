import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { fileRequests, files } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { deleteFileAction } from "@/lib/actions/files";
import { requestStatus, STATUS_LABEL } from "@/lib/file-requests";
import { formatBytes, formatDateTime } from "@/lib/format";
import { env } from "@/lib/env";
import { CopyButton } from "@/components/copy-button";
import { DeleteButton } from "@/components/delete-button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function ReceivedFilesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const [request] = await db
    .select()
    .from(fileRequests)
    .where(eq(fileRequests.id, id))
    .limit(1);
  if (!request) notFound();
  if (request.ownerId !== user.id && !user.isAdmin) notFound();

  const rows = await db
    .select({
      id: files.id,
      slug: files.slug,
      originalName: files.originalName,
      size: files.size,
      downloadCount: files.downloadCount,
      createdAt: files.createdAt,
    })
    .from(files)
    .where(eq(files.requestId, id))
    .orderBy(desc(files.createdAt));

  const status = requestStatus(request);
  const url = `${env.APP_URL}/r/${request.slug}`;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link
          href="/admin/file-requests"
          className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-3.5" />
          All requests
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">
              {request.title ?? "Untitled request"}
            </h1>
            <Badge variant={status === "open" ? "default" : "secondary"}>
              {STATUS_LABEL[status]}
            </Badge>
          </div>
          <div className="text-muted-foreground mt-1 flex items-center gap-2 font-mono text-sm">
            <a
              href={`/r/${request.slug}`}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
            >
              /r/{request.slug}
            </a>
            <CopyButton value={url} label="" />
          </div>
          <p className="text-muted-foreground mt-2 text-sm">
            {request.uploadCount} file{request.uploadCount === 1 ? "" : "s"} ·{" "}
            {formatBytes(request.receivedBytes)} received ·{" "}
            {status === "open" ? "open until" : "was open until"}{" "}
            {formatDateTime(request.expiresAt)}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No files received yet. Share the link to start collecting uploads.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Link</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead className="text-right">Downloads</TableHead>
                <TableHead>Received</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const fileUrl = `${env.APP_URL}/${row.slug}`;
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
                        <CopyButton value={fileUrl} label="" />
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
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatDateTime(row.createdAt)}
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
