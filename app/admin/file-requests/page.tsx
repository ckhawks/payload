import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { fileRequests, users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import {
  closeFileRequestAction,
  deleteFileRequestAction,
} from "@/lib/actions/file-requests";
import { requestStatus, STATUS_LABEL } from "@/lib/file-requests";
import { formatBytes, formatDateTime } from "@/lib/format";
import { env } from "@/lib/env";
import { FileRequestForm } from "@/components/forms/file-request-form";
import { CopyButton } from "@/components/copy-button";
import { DeleteButton } from "@/components/delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export default async function FileRequestsPage() {
  const user = await requireUser();

  const rows = await db
    .select({
      id: fileRequests.id,
      slug: fileRequests.slug,
      title: fileRequests.title,
      expiresAt: fileRequests.expiresAt,
      closedAt: fileRequests.closedAt,
      maxUploads: fileRequests.maxUploads,
      maxBytes: fileRequests.maxBytes,
      uploadCount: fileRequests.uploadCount,
      receivedBytes: fileRequests.receivedBytes,
      closeAfterFirst: fileRequests.closeAfterFirst,
      createdAt: fileRequests.createdAt,
      ownerName: users.username,
    })
    .from(fileRequests)
    .leftJoin(users, eq(fileRequests.ownerId, users.id))
    .where(user.isAdmin ? undefined : eq(fileRequests.ownerId, user.id))
    .orderBy(desc(fileRequests.createdAt));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">File requests</h1>
        <p className="text-muted-foreground text-sm">
          Share a link and let anyone upload files to you until it expires or
          hits a limit. Received files land under each request.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New request</CardTitle>
        </CardHeader>
        <CardContent>
          <FileRequestForm />
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">No requests yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Link</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Received</TableHead>
                {user.isAdmin && <TableHead>Owner</TableHead>}
                <TableHead>Expires</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const status = requestStatus(row);
                const url = `${env.APP_URL}/r/${row.slug}`;
                const received =
                  row.receivedBytes > 0
                    ? `${row.uploadCount} · ${formatBytes(row.receivedBytes)}`
                    : String(row.uploadCount);
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono">
                      <div className="flex items-center gap-2">
                        <a
                          href={`/r/${row.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline"
                        >
                          /r/{row.slug}
                        </a>
                        <CopyButton value={url} label="" />
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[14rem] truncate">
                      {row.title ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status === "open" ? "default" : "secondary"}>
                        {STATUS_LABEL[status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <Link
                        href={`/admin/file-requests/${row.id}`}
                        className="hover:underline"
                      >
                        {received}
                      </Link>
                    </TableCell>
                    {user.isAdmin && (
                      <TableCell className="text-muted-foreground">
                        {row.ownerName}
                      </TableCell>
                    )}
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatDateTime(row.expiresAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {status === "open" && (
                          <form action={closeFileRequestAction.bind(null, row.id)}>
                            <Button variant="outline" size="sm" type="submit">
                              Close
                            </Button>
                          </form>
                        )}
                        <DeleteButton
                          action={deleteFileRequestAction.bind(null, row.id)}
                          confirmLabel={`Delete this request? Files already received are kept in your Files.`}
                        />
                      </div>
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
