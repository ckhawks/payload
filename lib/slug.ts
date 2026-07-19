import { customAlphabet } from "nanoid";

// Short public slugs. Excludes look-alikes (0/O, 1/l/I) for easy hand-typing.
const slugAlphabet = "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const nano = customAlphabet(slugAlphabet, 7);

/** A random 7-char slug, e.g. "aB3xK9m". */
export function randomSlug(): string {
  return nano();
}

// Reserved top-level paths that must never be claimed as a public slug.
const RESERVED = new Set([
  "admin",
  "login",
  "register",
  "logout",
  "api",
  "g",
  "r",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

/**
 * Validate/normalize a user-supplied custom slug. Allows an optional file
 * extension (e.g. "my-image.png"). Returns null if invalid or reserved.
 */
export function normalizeCustomSlug(input: string): string | null {
  const slug = input.trim();
  if (!slug) return null;
  // letters, digits, dot, dash, underscore; must start with alphanumeric.
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(slug)) return null;
  if (slug.length > 128) return null;
  const base = slug.split(".")[0].toLowerCase();
  if (RESERVED.has(base) || RESERVED.has(slug.toLowerCase())) return null;
  return slug;
}

/** Extract a file extension including the dot, or "" if none. */
export function extname(filename: string): string {
  const i = filename.lastIndexOf(".");
  if (i <= 0 || i === filename.length - 1) return "";
  return filename.slice(i);
}
