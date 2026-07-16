import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiTokens, users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { revokeTokenAction } from "@/lib/actions/tokens";
import { formatDate } from "@/lib/format";
import { env } from "@/lib/env";
import { TokenForm } from "@/components/forms/token-form";
import { DeleteButton } from "@/components/delete-button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
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

export default async function TokensPage() {
  const user = await requireUser();

  const rows = await db
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      prefix: apiTokens.prefix,
      lastUsedAt: apiTokens.lastUsedAt,
      createdAt: apiTokens.createdAt,
      ownerName: users.username,
    })
    .from(apiTokens)
    .leftJoin(users, eq(apiTokens.ownerId, users.id))
    .where(user.isAdmin ? undefined : eq(apiTokens.ownerId, user.id))
    .orderBy(desc(apiTokens.createdAt));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">API tokens</h1>
        <p className="text-muted-foreground text-sm">
          Upload from ShareX, a CLI, or curl without logging in.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New token</CardTitle>
          <CardDescription>
            The token is shown once at creation — store it somewhere safe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TokenForm appUrl={env.APP_URL} />
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">No tokens yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Token</TableHead>
                {user.isAdmin && <TableHead>Owner</TableHead>}
                <TableHead>Last used</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground font-mono">
                    {row.prefix}…
                  </TableCell>
                  {user.isAdmin && (
                    <TableCell className="text-muted-foreground">
                      {row.ownerName}
                    </TableCell>
                  )}
                  <TableCell className="text-muted-foreground">
                    {row.lastUsedAt ? formatDate(row.lastUsedAt) : "never"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(row.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DeleteButton
                      action={revokeTokenAction.bind(null, row.id)}
                      confirmLabel={`Revoke "${row.name}"? Apps using it will stop working.`}
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
