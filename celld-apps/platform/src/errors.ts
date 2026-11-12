import { HttpError } from "./types";

// Errors thrown inside a Durable Object arrive over RPC as plain Errors, and custom
// properties like `status` may not survive the trip, so fall back to the message.
export function statusOf(e: unknown): number {
  if (e instanceof HttpError) return e.status;
  const s = (e as { status?: number })?.status;
  if (typeof s === "number") return s;
  const m = String((e as Error)?.message ?? "");
  if (/not found|does not exist/.test(m)) return 404;
  if (/already exists/.test(m)) return 409;
  return 400;
}
