// Locale-aware helpers layered on top of the existing `format.ts`.
// Bangla numerals (০-৯) are a user preference, separate from the UI
// language: a Bengali speaker in Bangladesh can still want Latin
// numerals, and a Bangla UI can still use Latin digits. So this lives
// next to the language provider rather than inside `format.ts`.

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"] as const;

/** Convert a string of Latin digits to Bangla digits. Other characters
 *  (including the ৳ sign) are left alone. */
export function toBnDigits(input: string): string {
  if (!input) return input;
  let out = "";
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    // ASCII '0'..'9' = 48..57
    if (ch >= "0" && ch <= "9") {
      out += BN_DIGITS[ch.charCodeAt(0) - 48];
    } else {
      out += ch;
    }
  }
  return out;
}

/** Convert a string with Bangla digits to Latin digits. Useful when
 *  parsing form input on the way into a numeric field. */
export function toLatinDigits(input: string): string {
  if (!input) return input;
  let out = "";
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const idx = (BN_DIGITS as readonly string[]).indexOf(ch);
    if (idx >= 0) {
      out += String(idx);
    } else {
      out += ch;
    }
  }
  return out;
}

/** Apply Bangla digit conversion to a string. Used inside the
 *  localizable formatters (`formatMoney`, `formatDate`,
 *  `formatOverlineDate`, `formatDateTime`) when the user has opted
 *  in to Bangla numerals. */
export function applyNumeralMode(
  input: string,
  numerals: "latin" | "bn",
): string {
  if (numerals === "bn") return toBnDigits(input);
  return input;
}
