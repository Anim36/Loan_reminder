// Money helpers.
//
// We store every monetary value in *poisha* (BDT × 100) as a plain
// `Int` in the database. The frontend, the API contract, and the
// Figma spec all work in taka (1 taka = 100 poisha). These helpers are
// the only place the conversion lives — never multiply or divide by
// 100 anywhere else.
//
// Rounding policy: every conversion rounds to the nearest poisha
// (half-up for taka → poisha) so a value typed in taka round-trips
// exactly. Floating point error is avoided entirely by going through
// `Math.round`.

/** Number of poisha in one taka. */
export const POISHA_PER_TAKA = 100;

/** Convert taka (whole or fractional) to poisha, rounding to the
 *  nearest integer. */
export function takaToPoisha(taka: number): number {
  if (!Number.isFinite(taka)) return 0;
  return Math.round(taka * POISHA_PER_TAKA);
}

/** Convert poisha back to taka. Returns a float — callers that need
 *  to display should hand the result to `lib/format.ts:formatMoney`. */
export function poishaToTaka(poisha: number): number {
  if (!Number.isFinite(poisha)) return 0;
  return poisha / POISHA_PER_TAKA;
}
