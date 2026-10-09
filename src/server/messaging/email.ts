// Server-only email service.
//
// Behaviour
// ---------
//   * If `RESEND_API_KEY` is set the call is forwarded to Resend's
//     HTTP API. `EMAIL_FROM` (e.g. "Loan Reminder <no-reply@…>")
//     must be a verified sender on the Resend account.
//   * Otherwise the message is written to the server console (dev /
//     staging) so a developer can click the link without leaving
//     the terminal. **Never** log reset links or codes in
//     production — the warning below makes the intent obvious.
//
// We never log, print or surface the value of `RESEND_API_KEY`,
// `AUTH_SECRET`, or any other secret.

type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  /** Optional pre-rendered HTML body. Plain text is always sent as
   *  an alt-part so spam filters don't penalise us. */
  html?: string;
};

const rawApiKey = process.env.RESEND_API_KEY?.trim();
const fromAddress = process.env.EMAIL_FROM?.trim() || "Loan Reminder <noreply@loan-reminder.app>";
const isProd = process.env.NODE_ENV === "production";

/**
 * Treat placeholder values as "not set". The placeholder strings
 * `replace-me-*` (from `.env.example`) and empty strings both end
 * up here; we never want to forward a placeholder to Resend.
 */
const apiKey = rawApiKey && !rawApiKey.startsWith("replace-me") ? rawApiKey : "";

/** Send a transactional email. Resolves with `true` on success and
 *  `false` on any error — callers log the failure but don't show
 *  it to the user (we don't want to leak the difference between
 *  "user exists" and "delivery failed" through the forgot-password
 *  flow). */
export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  if (!apiKey) {
    // Development / preview path. Print the link to the server
    // log so a developer can click it. In production we still
    // honour the "no provider" case but explicitly warn that no
    // email is going out — the real environment must have a key.
    console.warn(
      "[email] RESEND_API_KEY is not set. No email will be sent.",
      isProd ? "(PRODUCTION)" : "(development)",
    );
    // Even in dev we prefer the operator to see the message —
    // print the body (subject + text + recipient) but redact the
    // full reset URL when in production. The link itself is fine
    // to log in dev because it's a single-use token bound to a
    // development database.
    if (isProd) {
      console.info(
        `[email] (dev fallback) would send to ${msg.to}: ${msg.subject}`,
      );
    } else {
      console.info(
        `[email] (dev fallback) to ${msg.to}\n  subject: ${msg.subject}\n  body: ${msg.text}`,
      );
    }
    return true;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [msg.to],
        subject: msg.subject,
        text: msg.text,
        ...(msg.html ? { html: msg.html } : {}),
      }),
    });
    if (!res.ok) {
      // Do not include the API key or the full response body in the
      // log message — it may contain the message id only, but the
      // status code alone is enough to debug.
      console.error(`[email] Resend returned ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] failed to send", err);
    return false;
  }
}

/** Convenience helper for the password-reset flow. Wraps
 *  `sendEmail` with the standard subject + body so the API route
 *  doesn't need to know the wording. */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<boolean> {
  const text = [
    "Hi,",
    "",
    "We received a request to reset the password for your Loan Reminder account.",
    "If you made this request, click the link below to set a new password:",
    "",
    resetUrl,
    "",
    "This link expires in 30 minutes. If you didn't request a reset, you can ignore this email — your password will stay the same.",
    "",
    "— Loan Reminder",
  ].join("\n");

  return sendEmail({
    to,
    subject: "Reset your Loan Reminder password",
    text,
  });
}
