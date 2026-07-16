import "server-only";
import { codeToHtml } from "shiki";

/**
 * Render code to themed HTML. Uses minimal light/dark Shiki themes so the
 * result stays close to the grayscale aesthetic. Falls back to plain text if
 * the language is unknown.
 */
export async function highlight(
  code: string,
  language?: string | null,
): Promise<string> {
  const lang = (language ?? "text").trim().toLowerCase() || "text";
  try {
    return await codeToHtml(code, {
      lang,
      themes: { light: "min-light", dark: "min-dark" },
      defaultColor: false,
    });
  } catch {
    return codeToHtml(code, {
      lang: "text",
      themes: { light: "min-light", dark: "min-dark" },
      defaultColor: false,
    });
  }
}
