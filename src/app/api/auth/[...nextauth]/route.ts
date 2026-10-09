// Auth.js route handlers. The library exposes a single `handlers`
// object with `GET` and `POST` methods; we re-export them so
// Next can wire them to `/api/auth/*`.
import { handlers } from "@/server/auth";
export const { GET, POST } = handlers;

// Force this route to be dynamic — Auth.js reads cookies / headers
// on every request and the session must never be statically
// pre-rendered.
export const dynamic = "force-dynamic";
