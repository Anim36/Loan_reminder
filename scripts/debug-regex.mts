import { en } from "../src/lib/i18n/en.ts";
const f = (en as any)["ui.smsPreviewLabel"];
const src = f.toString();
console.log("SRC:", JSON.stringify(src));
const paren = src.match(/\(([^)]*)\)/);
console.log("paren:", paren);
const bare = src.match(/^[\s\(]?([a-zA-Z_$ \w$]*)\s*=>/);
console.log("bare:", bare);
