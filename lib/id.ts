import { customAlphabet } from "nanoid";

// Primary-key ids: URL-safe, unambiguous, long enough to never collide.
const alphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export const createId = customAlphabet(alphabet, 20);
