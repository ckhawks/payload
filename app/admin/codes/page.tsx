import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { registrationCodes, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { createCodeAction, deleteCodeAction } from "@/lib/actions/codes";
import { formatDate } from "@/lib/format";
import { CopyButton } from "@/components/copy-button";
import { DeleteButton } from "@/components/delete-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

export default async function CodesPage() {
  await requireAdmin();

  const usedByUser = alias(users, "used_by_user");
  const rows = await db
    .select({
      id: registrationCodes.id,
      code: registrationCodes.code,
      note: registrationCodes.note,
      usedAt: registrationCodes.usedAt,
      createdAt: registrationCodes.createdAt,
      usedByName: usedByUser.username,
    })
    .from(registrationCodes)
    .leftJoin(usedByUser, eq(registrationCodes.usedBy, usedByUser.id))
    .orderBy(desc(registrationCodes.createdAt));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Registration codes
        </h1>
        <p className="text-muted-foreground text-sm">
          Each code lets one friend create an account.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generate a code</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCodeAction} className="flex items-end gap-3">
            <div className="flex flex-1 flex-col gap-2">
              <Input
                name="note"
                placeholder="Note (optional) — e.g. who it's for"
                autoComplete="off"
              />
            </div>
            <Button type="submit">Generate</Button>
          </form>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">No codes yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono">
                    <div className="flex items-center gap-2">
                      {row.code}
                      {!row.usedAt && <CopyButton value={row.code} label="" />}
                    </div>
                  </TableCell>
                  <TableCell>
                    {row.usedAt ? (
                      <Badge variant="secondary">
                        used by {row.usedByName ?? "—"}
                      </Badge>
                    ) : (
                      <Badge>available</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.note ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(row.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DeleteButton
                      action={deleteCodeAction.bind(null, row.id)}
                      confirmLabel="Delete this code?"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
