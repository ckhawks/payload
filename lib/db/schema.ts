import {
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createId } from "@/lib/id";

/**
 * Users. The first user to register becomes the admin; everyone else joins with
 * a one-time registration code issued from the admin panel.
 */
export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(createId),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Server-side sessions, keyed by an opaque cookie token. */
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // sha-256 of the cookie token
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** One-time registration codes minted by an admin so friends can sign up. */
export const registrationCodes = pgTable("registration_codes", {
  id: text("id").primaryKey().$defaultFn(createId),
  code: text("code").notNull().unique(),
  note: text("note"),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  usedBy: text("used_by").references(() => users.id, { onDelete: "set null" }),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Uploaded files. Bytes live in R2 under `storageKey`; this is metadata only. */
export const files = pgTable(
  "files",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    slug: text("slug").notNull().unique(),
    originalName: text("original_name").notNull(),
    contentType: text("content_type").notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    storageKey: text("storage_key").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    downloadCount: integer("download_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("files_owner_idx").on(t.ownerId)],
);

/** Shortened links: slug -> target URL, with a click counter. */
export const links = pgTable(
  "links",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    slug: text("slug").notNull().unique(),
    targetUrl: text("target_url").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clickCount: integer("click_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("links_owner_idx").on(t.ownerId)],
);

/** Code/text snippets rendered at /g/<slug>. */
export const gists = pgTable(
  "gists",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    slug: text("slug").notNull().unique(),
    title: text("title"),
    content: text("content").notNull(),
    language: text("language"),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    viewCount: integer("view_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("gists_owner_idx").on(t.ownerId)],
);

/** Per-user API tokens for headless uploads (ShareX, curl, CLI). */
export const apiTokens = pgTable(
  "api_tokens",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    name: text("name").notNull(),
    tokenHash: text("token_hash").notNull().unique(), // sha-256 of the token
    prefix: text("prefix").notNull(), // first chars, shown for identification
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("api_tokens_owner_idx").on(t.ownerId)],
);

export type User = typeof users.$inferSelect;
export type ApiToken = typeof apiTokens.$inferSelect;
export type FileRow = typeof files.$inferSelect;
export type LinkRow = typeof links.$inferSelect;
export type GistRow = typeof gists.$inferSelect;
export type RegistrationCode = typeof registrationCodes.$inferSelect;
