import { en } from "../src/lib/i18n/en.ts";
const f = (en as any)["common.ago"];
const src = f.toString();
console.log("SRC:", JSON.stringify(src));
const arrowIdx = src.indexOf("=>");
const head = arrowIdx === -1 ? src : src.slice(0, arrowIdx);
console.log("HEAD:", JSON.stringify(head));
const paren = head.match(/\(([^)]*)\)/);
console.log("paren:", paren);
