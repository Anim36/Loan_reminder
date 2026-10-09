"use client";

/**
 * Shared LoanForm — used by both /loans/new and /loans/[id]/edit.
 *
 * Figma reference frames:
 *   - Add a loan · Desktop  10:4953
 *   - Add a loan · Mobile   10:5070
 *   - Add a loan · Field states · Desktop  10:5409
 *   - Edit a loan · Desktop  10:5180
 *   - Edit a loan · Mobile   10:5298
 *   - Add a loan · Date picker open · Desktop  10:5468 (fall back to the
 *     Step-3 `DatePicker` if the Figma frame is inaccessible).
 *
 * i18n: every user-visible string is read from the i18n dictionary via
 * `useT()`. Zod messages use keys (e.g. "ui.loanForm.errors.phone") and
 * are resolved to localized text at display time. Tone/locale codes
 * stay internal (English literals "Friendly"/"Neutral"/"Firm" are mapped
 * to the localized labels for display only).
 *
 * Validation: zod schema. Phone is BD format `+880 1XXXXXXXXX`
 * (the "+880" prefix is rendered in the field but never stored).
 * Email is only validated when the Email reminders switch is on.
 * Amount > 0; dueDate must be after dateGiven; consent required.
 * Save button is disabled while the form is invalid.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/components/ui/toast-provider";
import { Toggle } from "@/components/ui/toggle";
import { PageHeader } from "@/components/layout/page-header";
import { formatMoney, formatDate as formatDateLocalized } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import { useT } from "@/lib/i18n/LanguageProvider";
import { useTranslateApiError } from "@/lib/useApiError";
import { ApiError } from "@/lib/api-client";
import {
  useCreateLoanMutation,
  useUpdateLoanMutation,
} from "@/services/useQueries";
import type { Loan, Tone } from "@/types";

/* -----------------------------------------------------------------------------
 * Internal Tone codes are English literals. We map them to localized labels
 * at render time using a small lookup; the value stored on the loan and used
 * by the reminder engine stays as the English literal.
 * --------------------------------------------------------------------------- */

const TONE_CODES: Tone[] = ["Friendly", "Neutral", "Firm"];

/* -----------------------------------------------------------------------------
 * zod schema
 *
 * Messages are i18n keys, not final strings. The component resolves them
 * to localized text at display time, so the same schema works in either
 * language and messages change when the user toggles language.
 * --------------------------------------------------------------------------- */

// Strip spaces, then require a 10-digit body after the +880 prefix.
const phoneBody = z
  .string()
  .trim()
  .regex(/^1[3-9]\d{8}$/, "ui.loanForm.errors.phone");

const baseSchema = z.object({
  name: z.string().trim().min(1, "ui.loanForm.errors.name"),
  phone: phoneBody,
  amount: z.number().finite().positive("ui.loanForm.errors.amount"),
  dateGiven: z.string().min(1, "ui.loanForm.errors.dateGiven"),
  dueDate: z.string().min(1, "ui.loanForm.errors.dueDate"),
  note: z.string().optional(),
  tone: z.enum(["Friendly", "Neutral", "Firm"]),
  sms: z.boolean(),
  email: z.boolean(),
  emailAddress: z.string().optional(),
  consent: z.literal(true, {
    message: "ui.loanForm.errors.consent",
  }),
  messageLanguage: z.enum(["default", "en", "bn"]),
});

const schema = baseSchema
  .refine(
    (v) => new Date(v.dueDate) > new Date(v.dateGiven),
    {
      message: "ui.loanForm.errors.dueAfterGiven",
      path: ["dueDate"],
    }
  )
  .refine(
    (v) => {
      if (!v.email) return true;
      return z
        .string()
        .email("ui.loanForm.errors.email")
        .safeParse(v.emailAddress).success;
    },
    { message: "ui.loanForm.errors.email", path: ["emailAddress"] }
  );

type FormValues = z.infer<typeof baseSchema>;
type FormErrors = Partial<Record<keyof FormValues, string>>;

/* -----------------------------------------------------------------------------
 * Helpers
 * --------------------------------------------------------------------------- */

/** Format a Date as a YYYY-MM-DD string (local-date components only). */
function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* -----------------------------------------------------------------------------
 * Reusable bits — kept inside the file so the form stays a single read.
 * --------------------------------------------------------------------------- */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow w-full">{children}</p>;
}

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="w-full font-medium text-label text-text leading-[1.5]"
    >
      {children}
    </label>
  );
}

const inputBase =
  "w-full h-[48px] px-[14px] flex items-center gap-[10px] rounded-input border bg-surface overflow-hidden font-normal text-body";

function inputBorderClass(state: "default" | "focus" | "error" | "disabled") {
  if (state === "error")
    return "border border-status-overdue-text";
  if (state === "focus")
    return "border-2 border-brand-600 shadow-focus";
  return "border border-border";
}

/* -----------------------------------------------------------------------------
 * Props
 * --------------------------------------------------------------------------- */

export interface LoanFormProps {
  mode: "create" | "edit";
  /** Required for edit mode. Ignored for create. */
  initial?: Loan;
}

/* -----------------------------------------------------------------------------
 * Component
 * --------------------------------------------------------------------------- */

export function LoanForm({ mode, initial }: LoanFormProps) {
  const router = useRouter();
  const toast = useToast();
  const { t, lang } = useT();
  // Translates ApiError → user-visible string. The page-side `catch`
  // passes the thrown error here; the same helper is used for the
  // toast AND for inline field messages (when the API returns a
  // `fields` map from a 422).
  const translateApiError = useTranslateApiError();

  // Stable "today" via the shared hook — returns a Date object that
  // doesn't change across renders on the same day.
  const todayDate = useToday();
  const today = useMemo(() => toIsoDate(todayDate), [todayDate]);

  // React-Query mutations. The `onSuccess` of `useCreateLoanMutation`
  // already invalidates loans + dashboard + reports, so the rest of
  // the app picks up the new row on the next render.
  const createLoanM = useCreateLoanMutation();
  const updateLoanM = useUpdateLoanMutation();

  // Form state
  const [name, setName] = useState<string>(initial?.friend.name ?? "");
  const [phone, setPhone] = useState<string>(initial?.friend.phone ?? "");
  const [emailAddress, setEmailAddress] = useState<string>(
    initial?.friend.email ?? ""
  );
  const [amount, setAmount] = useState<string>(
    initial ? String(initial.amount) : ""
  );
  const [dateGiven, setDateGiven] = useState<string>(
    () => initial?.dateGiven ?? ""
  );
  const [dueDate, setDueDate] = useState<string>(initial?.dueDate ?? "");
  const [tone, setTone] = useState<Tone>(initial?.tone ?? "Friendly");
  const [sms, setSms] = useState<boolean>(
    initial?.reminders.sms ?? true
  );
  const [emailReminders, setEmailReminders] = useState<boolean>(
    initial?.reminders.email ?? false
  );
  const [note, setNote] = useState<string>(initial?.note ?? "");
  const [consent, setConsent] = useState<boolean>(initial?.consent ?? false);
  const [messageLanguage, setMessageLanguage] = useState<
    "default" | "en" | "bn"
  >(initial?.messageLanguage ?? "default");
  const [submitting, setSubmitting] = useState<boolean>(false);
  // Server-side field errors. We merge these with the live
  // local-validation errors at render time so the user sees both
  // kinds of feedback inline. Cleared on every successful submit
  // and when the user edits a field.
  const [apiErrors, setApiErrors] = useState<FormErrors>({});

  // Validation (live, never blocking typing). We resolve the i18n keys
  // returned by zod into localized strings so the user sees the right
  // language for the error.
  const errors: FormErrors = useMemo(() => {
    const out: FormErrors = {};
    const candidate: FormValues = {
      name: name.trim(),
      phone: phone.trim(),
      amount: Number(amount.replace(/,/g, "")) || 0,
      dateGiven: dateGiven || today || "",
      dueDate: dueDate || "",
      note: note.trim(),
      tone,
      sms,
      email: emailReminders,
      emailAddress: emailReminders ? emailAddress.trim() : "",
      consent: consent as true,
      messageLanguage,
    };
    const r = schema.safeParse(candidate);
    if (r.success) return out;
    for (const issue of r.error.issues) {
      const key = issue.path[0] as keyof FormValues | undefined;
      if (key && !out[key]) {
        // issue.message is an i18n key (or a fallback English string).
        const maybeKey = issue.message as keyof typeof t;
        out[key] = (t[maybeKey] as unknown as string) ?? issue.message;
      }
    }
    return out;
  }, [
    name,
    phone,
    amount,
    dateGiven,
    dueDate,
    tone,
    sms,
    emailReminders,
    emailAddress,
    consent,
    note,
    today,
    messageLanguage,
    t,
  ]);

  const isValid = Object.keys(errors).length === 0;

  // The live-validation errors and the server-side errors are
  // shown in the same place. The server's error wins when both
  // exist for a field (so the user can see the real reason even
  // when their local validation passed).
  const fieldError = (key: keyof FormValues): string | undefined =>
    apiErrors[key] ?? errors[key];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    setApiErrors({});
    try {
      const numericAmount = Number(amount.replace(/,/g, ""));
      const effectiveDateGiven = dateGiven || today;
      if (mode === "create") {
        const created = await createLoanM.mutateAsync({ body: {
          friend: {
            name: name.trim(),
            phone: phone.trim(),
            ...(emailReminders ? { email: emailAddress.trim() } : {}),
          },
          amount: numericAmount,
          dateGiven: effectiveDateGiven,
          dueDate,
          tone,
          reminders: { sms, email: emailReminders },
          note: note.trim() || undefined,
          consent,
          messageLanguage:
            messageLanguage === "default" ? undefined : messageLanguage,
          } });
        toast.show(t["ui.loanForm.saved"]);
        router.push(`/loans/${created.loan.id}`);
      } else if (initial) {
        const updated = await updateLoanM.mutateAsync({ id: initial.id, patch: {
          friend: {
            name: name.trim(),
            phone: phone.trim(),
            ...(emailReminders ? { email: emailAddress.trim() } : {}),
          },
          amount: numericAmount,
          dateGiven: effectiveDateGiven,
          dueDate,
          tone,
          reminders: { sms, email: emailReminders },
          note: note.trim() || undefined,
          consent,
          messageLanguage:
            messageLanguage === "default" ? undefined : messageLanguage,
        } });
        toast.show(t["ui.loanForm.saved"]);
        router.push(`/loans/${updated?.id ?? initial.id}`);
      }
    } catch (err) {
      // Log the raw cause for the developer. The user never sees this.
      console.error("[loan-form] save failed:", err);
      if (err instanceof ApiError) {
        // Map server field errors (e.g. { amount: ["amount_too_small"] })
        // to the form's field keys. The wire uses paths like
        // "friend.name" or "amount"; the form uses "name", "phone",
        // "amount", "dateGiven", "dueDate", "consent", "emailAddress".
        if (err.fields) {
          const next: FormErrors = {};
          for (const [path, list] of Object.entries(err.fields)) {
            if (!list || list.length === 0) continue;
            const first = list[0];
            const dictKey = `errors.api.${first}` as keyof typeof t;
            const msg = (t[dictKey] as unknown as string) ?? first;
            const tail = path.split(".").pop() ?? path;
            const formKey = ((): keyof FormValues => {
              if (tail === "name") return "name";
              if (tail === "phone") return "phone";
              if (tail === "amount") return "amount";
              if (tail === "givenDate") return "dateGiven";
              if (tail === "dueDate") return "dueDate";
              if (tail === "consentConfirmed") return "consent";
              if (tail === "email") return "emailAddress";
              if (tail === "reminderTimings") return "sms";
              return tail as keyof FormValues;
            })();
            if (!next[formKey]) next[formKey] = msg;
          }
          setApiErrors(next);
        }
        // Toast shows the *first* field error (or the top-level code)
        // — translated, never the raw English string.
        toast.show(translateApiError(err, "ui.loanForm.failed"));
      } else {
        // Not an ApiError — generic translation via the dictionary.
        toast.show(translateApiError(err, "ui.loanForm.failed"));
      }
      setSubmitting(false);
    }
  }

  /* ---- page chrome (matches Add a loan / Edit a loan Workspace) -------- */
  const toneLabel = (code: Tone): string => {
    if (code === "Friendly") return t["ui.loanForm.tone.friendly"];
    if (code === "Neutral") return t["ui.loanForm.tone.neutral"];
    return t["ui.loanForm.tone.firm"];
  };

  const msgLangLabel = (code: "default" | "en" | "bn"): string => {
    if (code === "default") return t["ui.loanForm.messageLanguageUseDefault"];
    if (code === "en") return t["ui.loanForm.messageLanguageEnglish"];
    return t["ui.loanForm.messageLanguageBangla"];
  };

  return (
    <div className="flex flex-1 flex-col items-start self-stretch">
      <div className="flex flex-col gap-8 self-stretch p-12">
        <Link
          href="/loans"
          className="inline-flex items-center gap-[10px] self-start font-normal text-body text-muted hover:text-text"
        >
          <ArrowLeft size={18} aria-hidden />
          <span>{t["ui.loanForm.backToLoans"]}</span>
        </Link>

        <PageHeader
          eyebrow={
            mode === "create"
              ? t["ui.loanForm.eyebrow.create"]
              : t["ui.loanForm.eyebrow.edit"]
          }
          title={
            mode === "create"
              ? t["ui.loanForm.title.create"]
              : t["ui.loanForm.title.edit"]
          }
          subtitle={
            mode === "create"
              ? t["ui.loanForm.subtitle.create"]
              : t["ui.loanForm.subtitle.edit"]
          }
        />

        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex w-full max-w-[720px] flex-col gap-8 rounded-card bg-surface p-10"
        >
          {/* -------- Friend details ----------------------------------- */}
          <section className="flex flex-col gap-5 self-stretch">
            <Eyebrow>{t["ui.loanForm.section.friend"]}</Eyebrow>

            <div className="flex flex-col gap-2 self-stretch">
              <FieldLabel htmlFor="loan-friend-name">
                {t["ui.loanForm.label.name"]}
              </FieldLabel>
              <FormInput
                id="loan-friend-name"
                value={name}
                onChange={setName}
                placeholder={t["ui.loanForm.namePlaceholder"]}
                error={fieldError("name")}
              />
            </div>

            <div className="flex flex-col gap-2 self-stretch">
              <FieldLabel htmlFor="loan-friend-phone">
                {t["ui.loanForm.label.phone"]}
              </FieldLabel>
              <FormInput
                id="loan-friend-phone"
                value={phone}
                onChange={setPhone}
                placeholder={t["ui.phonePlaceholder"]}
                prefix="+880"
                error={fieldError("phone")}
                inputMode="numeric"
              />
            </div>

            <div className="flex flex-col gap-2 self-stretch">
              <FieldLabel htmlFor="loan-friend-email">
                {t["ui.loanForm.label.email"]}
              </FieldLabel>
              <FormInput
                id="loan-friend-email"
                value={emailAddress}
                onChange={setEmailAddress}
                placeholder={t["ui.emailPlaceholder"]}
                disabled={!emailReminders}
                error={emailReminders ? fieldError("emailAddress") : undefined}
                helperText={
                  emailReminders
                    ? undefined
                    : t["ui.emailOptionalHelper"]
                }
              />
            </div>
          </section>

          <Divider />

          {/* -------- Loan details ------------------------------------- */}
          <section className="flex flex-col gap-5 self-stretch">
            <Eyebrow>{t["ui.loanForm.section.loan"]}</Eyebrow>

            <div className="flex flex-col gap-2 self-stretch">
              <FieldLabel htmlFor="loan-amount">
                {t["ui.loanForm.label.amount"]}
              </FieldLabel>
              <FormInput
                id="loan-amount"
                value={amount}
                onChange={setAmount}
                placeholder="5,000"
                prefix="৳"
                error={fieldError("amount")}
                inputMode="decimal"
                preview={
                  Number(amount.replace(/,/g, "")) > 0
                    ? formatMoney(Number(amount.replace(/,/g, "")))
                    : undefined
                }
              />
            </div>

            <div className="flex flex-col gap-4 self-stretch sm:flex-row">
              <div className="flex flex-1 flex-col gap-2">
                <FieldLabel htmlFor="loan-date-given">
                  {t["ui.loanForm.label.dateGiven"]}
                </FieldLabel>
                <DatePicker
                  label={t["ui.loanForm.label.dateGiven"]}
                  value={
                    dateGiven
                      ? new Date(`${dateGiven}T00:00:00`)
                      : today
                        ? new Date(`${today}T00:00:00`)
                        : undefined
                  }
                  onChange={(d) => setDateGiven(toIsoDate(d))}
                  placeholder={t["ui.loanForm.dateGiven.placeholder"]}
                />
                {fieldError("dateGiven") ? (
                  <p className="font-normal text-helper text-status-overdue-text">
                    {fieldError("dateGiven")}
                  </p>
                ) : dateGiven ? (
                  <p className="font-normal text-helper text-muted">
                    {formatDateLocalized(dateGiven, { lang })}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-1 flex-col gap-2">
                <FieldLabel htmlFor="loan-due-date">
                  {t["ui.loanForm.label.dueDate"]}
                </FieldLabel>
                <DatePicker
                  label={t["ui.loanForm.label.dueDate"]}
                  value={dueDate ? new Date(`${dueDate}T00:00:00`) : undefined}
                  onChange={(d) => setDueDate(toIsoDate(d))}
                  placeholder={t["ui.loanForm.dueDate.placeholder"]}
                />
                {fieldError("dueDate") ? (
                  <p className="font-normal text-helper text-status-overdue-text">
                    {fieldError("dueDate")}
                  </p>
                ) : dueDate ? (
                  <p className="font-normal text-helper text-muted">
                    {formatDateLocalized(dueDate, { lang })}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-2 self-stretch">
              <FieldLabel htmlFor="loan-note">
                {t["ui.loanForm.label.note"]}
              </FieldLabel>
              <textarea
                id="loan-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t["ui.loanForm.notePlaceholder"]}
                rows={4}
                className={[
                  "w-full min-h-[112px] rounded-input border border-border bg-surface px-[14px] py-[14px] font-normal text-body text-text placeholder:text-placeholder outline-none focus:border-2 focus:border-brand-600 focus:shadow-focus focus:px-[13px] focus:py-[13px] resize-none",
                ].join(" ")}
              />
              <p className="font-normal text-helper text-muted">
                {t["ui.loanForm.note.helper"]}
              </p>
            </div>
          </section>

          <Divider />

          {/* -------- Reminder preferences ---------------------------- */}
          <section className="flex flex-col gap-5 self-stretch">
            <Eyebrow>{t["ui.loanForm.section.reminders"]}</Eyebrow>

            <div className="flex flex-col gap-2 self-stretch">
              <FieldLabel>{t["ui.loanForm.toneQuestion"]}</FieldLabel>
              <div
                role="radiogroup"
                aria-label={t["ui.loanForm.toneAria"]}
                className="flex w-full items-stretch gap-1 rounded-input bg-neutral-50 p-1 max-w-md"
              >
                {TONE_CODES.map((code) => {
                  const active = code === tone;
                  return (
                    <button
                      key={code}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setTone(code)}
                      data-tone={code}
                      className={[
                        "flex-1 min-w-0 rounded-[9px] px-2 py-[9px] text-center whitespace-nowrap transition-colors",
                        active
                          ? "bg-surface shadow-card font-semibold text-label text-brand-600"
                          : "bg-transparent font-normal text-label text-muted hover:text-text",
                      ].join(" ")}
                    >
                      {toneLabel(code)}
                    </button>
                  );
                })}
              </div>
            </div>

            <ReminderRow
              title={t["ui.loanForm.smsTitle"]}
              subtitle={t["ui.loanForm.smsSubtitle"]}
              checked={sms}
              onChange={setSms}
            />

            <ReminderRow
              title={t["ui.loanForm.emailTitle"]}
              subtitle={t["ui.loanForm.emailSubtitle"]}
              checked={emailReminders}
              onChange={setEmailReminders}
            />

            <div className="flex flex-col gap-2 self-stretch">
              <FieldLabel>{t["ui.messageLanguage"]}</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { value: "default" as const },
                    { value: "en" as const },
                    { value: "bn" as const },
                  ]
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={messageLanguage === opt.value}
                    onClick={() => setMessageLanguage(opt.value)}
                    className={[
                      "inline-flex items-center rounded-pill border px-3 py-1.5 text-helper font-semibold transition-colors",
                      messageLanguage === opt.value
                        ? "bg-brand-50 border-chip-selected-border text-brand-600"
                        : "bg-surface border-border text-muted hover:text-text",
                    ].join(" ")}
                  >
                    {msgLangLabel(opt.value)}
                  </button>
                ))}
              </div>
              <p className="font-normal text-helper text-muted">
                {t["ui.loanForm.messageLanguageHelper"]}
              </p>
            </div>

            <div className="flex flex-col gap-2 self-stretch">
              <Checkbox
                checked={consent}
                onChange={setConsent}
                label={t["ui.loanForm.label.consent"]}
              />
              <p className="font-normal text-helper text-muted">
                {t["ui.loanForm.consent.helper"]({
                  terms: t["ui.loanForm.termsIntro"],
                  privacy: t["ui.loanForm.privacyIntro"],
                })}
              </p>
              {fieldError("consent") ? (
                <p className="font-normal text-helper text-status-overdue-text">
                  {fieldError("consent")}
                </p>
              ) : null}
            </div>
          </section>

          <Divider />

          {/* -------- Form actions ------------------------------------ */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!isValid || submitting}
                  className="w-full"
                  icon={<Check size={18} aria-hidden />}
                >
                  {submitting ? t["ui.loanForm.saving"] : t["ui.loanForm.save"]}
                </Button>
              </div>
              <div className="flex-1">
                <Link href="/loans" className="block">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={(e) => {
                      e.preventDefault();
                      router.push("/loans");
                    }}
                  >
                    {t["ui.loanForm.cancel"]}
                  </Button>
                </Link>
              </div>
            </div>
            <p className="text-center font-normal text-helper text-muted">
              {t["ui.remindersStop"]}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * Internal helpers
 * --------------------------------------------------------------------------- */

function Divider() {
  return <div className="h-px w-full bg-border" aria-hidden />;
}

function ReminderRow({
  title,
  subtitle,
  checked,
  onChange,
}: {
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-4 self-stretch">
      <div className="flex flex-1 min-w-0 flex-col gap-[2px] leading-[1.5]">
        <p className="font-medium text-body text-text">{title}</p>
        <p className="font-normal text-helper text-muted">{subtitle}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function FormInput({
  id,
  value,
  onChange,
  placeholder,
  prefix,
  error,
  disabled,
  helperText,
  inputMode,
  preview,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  prefix?: string;
  error?: string;
  disabled?: boolean;
  helperText?: string;
  inputMode?: "numeric" | "decimal" | "text";
  preview?: string;
}) {
  const [focused, setFocused] = useState(false);
  const state: "default" | "focus" | "error" | "disabled" = disabled
    ? "disabled"
    : error
      ? "error"
      : focused
        ? "focus"
        : "default";

  return (
    <div className="flex flex-col gap-2 w-full">
      <div
        className={[
          inputBase,
          inputBorderClass(state),
          disabled ? "bg-disabled-bg" : "",
        ].join(" ")}
      >
        {prefix ? (
          <span
            className={[
              "shrink-0 font-normal text-body whitespace-nowrap",
              disabled ? "text-disabled-text" : "text-muted",
            ].join(" ")}
          >
            {prefix}
          </span>
        ) : null}
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          inputMode={inputMode}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : helperText ? `${id}-help` : undefined}
          className={[
            "flex-1 min-w-0 bg-transparent outline-none font-normal text-body",
            disabled
              ? "text-disabled-text placeholder:text-disabled-text"
              : "text-text placeholder:text-placeholder",
          ].join(" ")}
        />
      </div>
      {error ? (
        <p
          id={`${id}-err`}
          className="font-normal text-helper text-status-overdue-text"
        >
          {error}
        </p>
      ) : helperText ? (
        <p
          id={`${id}-help`}
          className="font-normal text-helper text-muted"
        >
          {helperText}
        </p>
      ) : preview ? (
        <p className="font-normal text-helper text-muted">{preview}</p>
      ) : null}
    </div>
  );
}

/* Localized date formatter used by both DatePicker footer lines. */
