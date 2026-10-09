// Bangladeshi phone-number helpers.
//
// The API contract and the database store phone numbers in
// E.164 form (`+8801XXXXXXXXX`). The local part is 10 digits
// starting with `1[3-9]` — every mobile operator in Bangladesh
// uses a 13/14/15/16/17/18/19 prefix on a 10-digit number.
//
// `normalisePhone` accepts any of:
//   - `+8801712345678`
//   - `8801712345678`
//   - `01712345678`
// and returns the canonical `+8801XXXXXXXXX` form, or `null` on
// invalid input. Callers should treat `null` as a 422 with the
// `phone_invalid` code.
//
// `maskPhone` returns a printable version safe for logs: only
// the first 5 and last 2 digits of the local part are kept.

const LOCAL_REGEX = /^1[3-9]\d{8}$/;

export type PhoneFormat = "e164" | "local";

/** Normalise a phone number to E.164 form (`+8801XXXXXXXXX`).
 *  Returns `null` on invalid input. */
export function normalisePhone(input: string): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim().replace(/[\s\-()+]/g, "");
  // Strip the country code if present.
  let body = trimmed;
  if (body.startsWith("00880")) body = body.slice(5);
  else if (body.startsWith("880")) body = body.slice(3);
  // Drop a leading "0" so the local form `01712345678` matches
  // the same regex as the country-coded form.
  if (body.startsWith("0")) body = body.slice(1);
  if (!LOCAL_REGEX.test(body)) return null;
  return `+880${body}`;
}

/** True iff the input is a valid Bangladeshi mobile number in
 *  any of the accepted forms. */
export function isValidPhone(input: string): boolean {
  return normalisePhone(input) !== null;
}

/** Format a phone number for display. `e164` is the canonical
 *  `+8801XXXXXXXXX` form. `local` is the leading-zero form
 *  (`01XXXXXXXXX`) preferred in the UI. */
export function formatPhone(e164: string, fmt: PhoneFormat = "e164"): string {
  if (!e164.startsWith("+880") || e164.length !== 14) return e164;
  const local = "0" + e164.slice(4);
  return fmt === "local" ? local : e164;
}

/** Return a printable, log-safe version of a phone number.
 *  Only the first 5 and last 2 digits of the local part are kept. */
export function maskPhone(e164: string | null | undefined): string {
  if (!e164) return "<none>";
  if (!e164.startsWith("+880") || e164.length !== 14) return "<invalid>";
  return `+8801XXX…XXX${e164.slice(-2)}`;
}
