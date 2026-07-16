import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, files, links, gists } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { deleteUserAction } from "@/lib/actions/users";
import { formatDate } from "@/lib/format";
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

export default async function UsersPage() {
  const admin = await requireAdmin();

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      isAdmin: users.isAdmin,
      createdAt: users.createdAt,
      files: sql<number>`(select count(*)::int from ${files} where ${files.ownerId} = ${users.id})`,
      links: sql<number>`(select count(*)::int from ${links} where ${links.ownerId} = ${users.id})`,
      gists: sql<number>`(select count(*)::int from ${gists} where ${gists.ownerId} = ${users.id})`,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground text-sm">
          Deleting a user removes their files, links, and gists.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Files</TableHead>
              <TableHead className="text-right">Links</TableHead>
              <TableHead className="text-right">Gists</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.username}</TableCell>
                <TableCell>
                  {row.isAdmin ? (
                    <Badge>admin</Badge>
                  ) : (
                    <Badge variant="secondary">member</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.files}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.links}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.gists}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(row.createdAt)}
                </TableCell>
                <TableCell>
                  {row.id !== admin.id && (
                    <DeleteButton
                      action={deleteUserAction.bind(null, row.id)}
                      confirmLabel={`Delete ${row.username} and all their content?`}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
