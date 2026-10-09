"use client";

// Reminder settings — /reminders
//
// Figma reference: Reminder settings · Friendly (10:5901 / 10:6064),
// Neutral (10:6220 / 10:6264), Firm (10:6308 / 10:6352), and the
// shared "default preferences" + "save" panel that lives on every tone
// frame.
//
// Behaviour:
//   - The active tone is held in client state and persisted by
//     `reminderService`. The tone chip is a re-purposed SegmentedControl
//     (so all three tones always render and we never need a server round
//     trip to switch).
//   - SMS and Email editors read/write the tone's template via the
//     service. The previews are recomputed on every keystroke using the
//     same placeholder substitution the spec asks for.
//   - Default channel + timing preferences are toggled through the same
//     service. "Save changes" persists the whole settings object and
//     shows the success toast.
//
// i18n: every visible string is read from the dictionary. The tone and
// message-language segmented controls keep their values in English
// (they map to internal codes), but the rendered labels are
// localized. Preview friend / amount / due-date / my-name / email are
// pulled from the i18n dictionary so they can be re-localized.

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Mail,
  MessageSquare,
} from "lucide-react";
import { SegmentedControl, type Tone } from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/components/ui/toast-provider";
import { PageHeader } from "@/components/layout/page-header";
import {
  REMINDER_SEED,
  useReminderSettings,
  type ReminderSettings,
} from "@/services";
import { useT } from "@/lib/i18n/LanguageProvider";

/* Defensive accessor — fills missing fields from the seed so the
 * page never crashes during a migration. */
function templateFor(
  settings: ReminderSettings,
  tone: Tone,
  lang: "en" | "bn",
) {
  return (
    settings.templates?.[tone]?.[lang] ??
    REMINDER_SEED.templates[tone]?.[lang] ??
    { sms: "", emailSubject: "", email: "" }
  );
}

const PLACEHOLDERS: Array<{ label: string }> = [
  { label: "{friend_name}" },
  { label: "{amount}" },
  { label: "{due_date}" },
  { label: "{my_name}" },
];

export default function RemindersPage() {
  const { t, lang } = useT();
  const { settings, setTone, saveAll, updateMessageLanguage } =
    useReminderSettings();
  const { show } = useToast();

  const safeSettings: ReminderSettings =
    settings && settings.templates && settings.channels
      ? settings
      : REMINDER_SEED;
  const tone: Tone = safeSettings.tone ?? REMINDER_SEED.tone;
  const [messageLanguage, setMessageLanguageState] = useState<
    "en" | "bn"
  >(safeSettings.messageLanguage ?? REMINDER_SEED.messageLanguage);

  const initial = templateFor(safeSettings, tone, messageLanguage);
  const [smsDraft, setSmsDraft] = useState(initial.sms);
  const [emailSubjectDraft, setEmailSubjectDraft] = useState(initial.emailSubject);
  const [emailDraft, setEmailDraft] = useState(initial.email);
  const [saving, setSaving] = useState(false);

  function syncToTone(next: Tone) {
    const tmpl = templateFor(safeSettings, next, messageLanguage);
    setSmsDraft(tmpl.sms);
    setEmailSubjectDraft(tmpl.emailSubject);
    setEmailDraft(tmpl.email);
  }
  function syncToLang(next: "en" | "bn") {
    setMessageLanguageState(next);
    const tmpl = templateFor(safeSettings, tone, next);
    setSmsDraft(tmpl.sms);
    setEmailSubjectDraft(tmpl.emailSubject);
    setEmailDraft(tmpl.email);
  }

  const smsPreview = useMemo(() => renderTemplate(smsDraft, t), [smsDraft, t]);
  const emailPreview = useMemo(
    () => renderTemplate(emailDraft, t),
    [emailDraft, t],
  );
  const subjectPreview = useMemo(
    () => renderTemplate(emailSubjectDraft, t),
    [emailSubjectDraft, t],
  );

  function insertTag(
    label: string,
    set: (v: string | ((prev: string) => string)) => void,
  ) {
    set((prev) =>
      prev.endsWith(" ") || prev.length === 0
        ? prev + label
        : prev + " " + label,
    );
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      const baseTemplates = REMINDER_SEED.templates;
      const safeTemplates = {
        ...baseTemplates,
        ...(safeSettings.templates ?? {}),
      };
      const safeTone = safeTemplates[tone] ?? baseTemplates[tone];
      await saveAll({
        ...safeSettings,
        messageLanguage,
        templates: {
          ...safeTemplates,
          [tone]: {
            ...safeTone,
            [messageLanguage]: {
              sms: smsDraft,
              email: emailDraft,
              emailSubject: emailSubjectDraft,
            },
          },
        },
      });
      show(t["ui.settingsSaved"]);
    } finally {
      setSaving(false);
    }
  }

  const toneTitleKey =
    `ui.reminders.toneTitle.${tone.toLowerCase()}` as keyof ReturnType<typeof useT>["t"];
  const toneSubKey =
    `ui.reminders.toneSub.${tone.toLowerCase()}` as keyof ReturnType<typeof useT>["t"];
  const toneDescKey =
    `ui.reminders.toneDesc.${tone.toLowerCase()}` as keyof ReturnType<typeof useT>["t"];

  return (
    <section className="flex flex-col gap-8 px-5 py-10 md:px-12 md:py-10">
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href="/loans"
            className="inline-flex w-fit items-center gap-1.5 text-helper font-normal text-muted hover:text-text"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            {t["ui.backToLoans"]}
          </Link>
          <span aria-hidden className="text-muted">·</span>
          <Link
            href="/reminders/history"
            className="inline-flex w-fit items-center gap-1.5 text-helper font-normal text-brand-600 hover:underline"
          >
            {t["ui.reminders.historyLink"]}
          </Link>
        </div>

        <PageHeader
          title={t[toneTitleKey] as string}
          subtitle={t[toneSubKey] as string}
        />
      </div>

      <div
        data-node-id={
          tone === "Friendly"
            ? "10:5935"
            : tone === "Neutral"
            ? "10:6224"
            : "10:6312"
        }
        className="flex w-full max-w-md flex-col gap-3"
      >
        <p className="text-label font-medium text-text">{t["ui.reminders.messageTone"]}</p>
        <SegmentedControl
          tone={tone}
          onChange={(next) => {
            syncToTone(next);
            void setTone(next);
          }}
          labels={{
            Friendly: t["ui.toneFriendly"],
            Neutral: t["ui.toneNeutral"],
            Firm: t["ui.toneFirm"],
          }}
        />
        <p className="text-helper font-normal text-muted">
          {t[toneDescKey] as string}
        </p>
      </div>

      <div
        data-node-id="10:5942-message-language"
        className="flex w-full max-w-md flex-col gap-3"
      >
        <p className="text-label font-medium text-text">{t["ui.messageLanguage"]}</p>
        <div
          role="presentation"
          onClick={(e) => {
            const target = e.target as HTMLElement;
            const label = target.textContent?.trim();
            if (label === "English" || label === "বাংলা") {
              const next = label === "English" ? "en" : "bn";
              syncToLang(next);
              void updateMessageLanguage(next);
            }
          }}
        >
          <div
            role="tablist"
            aria-label={t["ui.messageLanguageAria"]}
            className="inline-flex w-full items-center gap-1 rounded-pill border border-border bg-surface p-1"
          >
            {(["en", "bn"] as const).map((optionLang) => (
              <button
                key={optionLang}
                type="button"
                role="tab"
                aria-selected={messageLanguage === optionLang}
                data-state={messageLanguage === optionLang ? "selected" : "unselected"}
                onClick={() => {
                  syncToLang(optionLang);
                  void updateMessageLanguage(optionLang);
                }}
                className={[
                  "flex-1 min-w-0 rounded-pill px-3 py-1.5 text-helper font-semibold transition-colors",
                  messageLanguage === optionLang
                    ? "bg-brand-50 text-brand-600"
                    : "text-muted hover:text-text",
                ].join(" ")}
              >
                {optionLang === "en" ? "English" : "বাংলা"}
              </button>
            ))}
          </div>
        </div>
        <p className="text-helper font-normal text-muted">
          {t["ui.reminders.unicodeNote"]}
        </p>
      </div>

      <div
        data-node-id={
          tone === "Friendly"
            ? "10:5945"
            : tone === "Neutral"
            ? "10:6232"
            : "10:6320"
        }
        className="flex w-full flex-col gap-6 md:flex-row md:items-start"
      >
        <SmsEditor
          sms={smsDraft}
          onSmsChange={setSmsDraft}
          onInsertTag={(label) => insertTag(label, setSmsDraft)}
          tone={tone}
          t={t}
        />
        <SmsPreview tone={tone} body={smsPreview} t={t} />
      </div>

      <div
        data-node-id={
          tone === "Friendly"
            ? "10:5987"
            : tone === "Neutral"
            ? "10:6246"
            : "10:6334"
        }
        className="flex w-full flex-col gap-6 md:flex-row md:items-start"
      >
        <EmailEditor
          subject={emailSubjectDraft}
          body={emailDraft}
          onSubjectChange={setEmailSubjectDraft}
          onBodyChange={setEmailDraft}
          onInsertTag={(label) => insertTag(label, setEmailDraft)}
          tone={tone}
          t={t}
        />
        <EmailPreview
          tone={tone}
          subject={subjectPreview}
          body={emailPreview}
          t={t}
        />
      </div>

      <div
        data-node-id={tone === "Friendly" ? "10:6025" : undefined}
        className="flex w-full flex-col gap-6 rounded-card border border-border bg-surface p-6 shadow-card"
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-card-heading font-semibold text-text">
            {t["ui.reminders.defaultsTitle"]}
          </h2>
          <p className="text-helper font-normal text-muted">
            {t["ui.reminders.defaultsSub"]}
          </p>
        </div>

        <div className="flex flex-col gap-6 md:flex-row">
          <ChannelRow
            label={t["ui.reminders.smsLabel"]}
            sub={t["ui.reminders.smsSub"]}
            checked={safeSettings.channels.sms}
            onChange={(v) =>
              void saveAll({
                ...safeSettings,
                channels: { ...safeSettings.channels, sms: v },
              })
            }
          />
          <ChannelRow
            label={t["ui.reminders.emailLabel"]}
            sub={t["ui.reminders.emailSub"]}
            checked={safeSettings.channels.email}
            onChange={(v) =>
              void saveAll({
                ...safeSettings,
                channels: { ...safeSettings.channels, email: v },
              })
            }
          />
        </div>

        <div className="h-px w-full bg-border" />

        <ChannelRow
          label={t["ui.reminders.threeDaysBefore"]}
          sub=""
          checked={safeSettings.channels.threeDaysBefore}
          onChange={(v) =>
            void saveAll({
              ...safeSettings,
              channels: { ...safeSettings.channels, threeDaysBefore: v },
            })
          }
        />
        <ChannelRow
          label={t["ui.reminders.onDueDate"]}
          sub=""
          checked={safeSettings.channels.onDueDate}
          onChange={(v) =>
            void saveAll({
              ...safeSettings,
              channels: { ...safeSettings.channels, onDueDate: v },
            })
          }
        />
        <ChannelRow
          label={t["ui.reminders.everyTwoDaysOverdue"]}
          sub=""
          checked={safeSettings.channels.everyTwoDaysAfterOverdue}
          onChange={(v) =>
            void saveAll({
              ...safeSettings,
              channels: {
                ...safeSettings.channels,
                everyTwoDaysAfterOverdue: v,
              },
            })
          }
        />

        <p className="text-badge font-normal text-muted">
          {t["ui.reminders.noteFootnote"]}
        </p>
      </div>

      <div
        data-node-id={tone === "Friendly" ? "10:6058" : undefined}
        className="flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between"
      >
        <p className="text-badge font-normal text-muted">
          {t["ui.reminders.alwaysPolite"]}
        </p>
        <Button
          variant="primary"
          onClick={() => void handleSave()}
          icon={<Check size={18} aria-hidden="true" />}
          disabled={saving}
        >
          {saving ? t["ui.loanForm.saving"] : t["ui.reminders.saveChanges"]}
        </Button>
      </div>

      <span className="sr-only">{t["ui.loadingReminders"]}</span>
      <span className="sr-only">{lang}</span>
    </section>
  );
}

function renderTemplate(
  body: string,
  t: ReturnType<typeof useT>["t"],
): string {
  return body
    .replaceAll("{friend_name}", t["ui.previewFriend"] as string)
    .replaceAll("{amount}", t["ui.previewAmount"] as string)
    .replaceAll("{due_date}", t["ui.previewDueDate"] as string)
    .replaceAll("{my_name}", t["ui.previewMyName"] as string);
}

function SmsEditor({
  sms,
  onSmsChange,
  onInsertTag,
  tone,
  t,
}: {
  sms: string;
  onSmsChange: (v: string) => void;
  onInsertTag: (label: string) => void;
  tone: Tone;
  t: ReturnType<typeof useT>["t"];
}) {
  const isUnicode = /[^\x00-\x7f]/.test(sms);
  const max = isUnicode ? 70 : 160;
  const chars = sms.length;
  const segments = Math.max(1, Math.ceil(chars / max));
  return (
    <div
      data-node-id={
        tone === "Friendly"
          ? "10:5946"
          : tone === "Neutral"
          ? "10:6233"
          : "10:6321"
      }
      className="flex min-w-0 flex-1 flex-col gap-6 overflow-clip rounded-card border border-border bg-surface p-7 shadow-card"
    >
      <div className="flex items-center gap-2.5">
        <MessageSquare className="size-5 text-text" aria-hidden="true" />
        <p className="flex-1 text-card-heading font-medium text-text">
          {t["ui.reminders.smsHeader"]}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="sms-message"
          className="text-helper font-medium text-text"
        >
          {t["ui.reminders.messageLabel"]}
        </label>
        <textarea
          id="sms-message"
          value={sms}
          onChange={(e) => onSmsChange(e.target.value)}
          rows={6}
          className="min-h-[168px] w-full resize-y rounded-input border border-border bg-surface px-4 py-4 text-body font-normal leading-6 text-text outline-none placeholder:text-placeholder focus:border-brand-600 focus:border-2"
        />
        <p
          className="font-normal text-badge text-muted"
          aria-live="polite"
        >
          {t["ui.reminders.smsChars"](chars, segments, max)}
          {isUnicode ? ` · ${t["ui.reminders.smsUnicodeNote"]}` : ""}
        </p>
      </div>

      <PlaceholderChips onInsert={onInsertTag} t={t} />
    </div>
  );
}

function EmailEditor({
  subject,
  body,
  onSubjectChange,
  onBodyChange,
  onInsertTag,
  tone,
  t,
}: {
  subject: string;
  body: string;
  onSubjectChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  onInsertTag: (label: string) => void;
  tone: Tone;
  t: ReturnType<typeof useT>["t"];
}) {
  return (
    <div
      data-node-id={
        tone === "Friendly"
          ? "10:5988"
          : tone === "Neutral"
          ? "10:6247"
          : "10:6335"
      }
      className="flex min-w-0 flex-1 flex-col gap-6 overflow-clip rounded-card border border-border bg-surface p-7 shadow-card"
    >
      <div className="flex items-center gap-2.5">
        <Mail className="size-5 text-text" aria-hidden="true" />
        <p className="flex-1 text-card-heading font-medium text-text">
          {t["ui.reminders.emailHeader"]}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="email-subject"
          className="text-helper font-medium text-text"
        >
          {t["ui.reminders.subjectLabel"]}
        </label>
        <input
          id="email-subject"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          className="w-full rounded-input border border-border bg-surface px-[14px] py-3.5 text-label font-normal text-text outline-none placeholder:text-placeholder focus:border-brand-600 focus:border-2"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="email-body"
          className="text-helper font-medium text-text"
        >
          {t["ui.reminders.messageLabel"]}
        </label>
        <textarea
          id="email-body"
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          rows={6}
          className="min-h-[168px] w-full resize-y rounded-input border border-border bg-surface px-4 py-4 text-body font-normal leading-6 text-text outline-none placeholder:text-placeholder focus:border-brand-600 focus:border-2"
        />
      </div>

      <PlaceholderChips onInsert={onInsertTag} t={t} />
      <p className="text-badge font-normal text-muted">
        {t["ui.reminders.emailRepliesHelper"]}
      </p>
    </div>
  );
}

function PlaceholderChips({
  onInsert,
  t,
}: {
  onInsert: (label: string) => void;
  t: ReturnType<typeof useT>["t"];
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-badge font-normal text-muted">
        {t["ui.reminders.placeholdersHelper"]}
      </p>
      <div className="flex flex-wrap items-start gap-2">
        {PLACEHOLDERS.map(({ label }) => (
          <button
            key={label}
            type="button"
            onClick={() => onInsert(label)}
            className="inline-flex items-center whitespace-nowrap rounded-md bg-brand-50 px-2 py-1 text-badge font-normal text-brand-600 hover:bg-brand-600 hover:text-white"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SmsPreview({
  tone,
  body,
  t,
}: {
  tone: Tone;
  body: string;
  t: ReturnType<typeof useT>["t"];
}) {
  return (
    <div
      data-node-id={
        tone === "Friendly"
          ? "10:5966"
          : tone === "Neutral"
          ? "10:6238"
          : "10:6326"
      }
      className="flex w-full shrink-0 flex-col gap-4 self-stretch overflow-clip rounded-card bg-neutral-50 p-6 md:w-[360px]"
    >
      <p className="text-center text-badge font-semibold text-muted">
        {t["ui.smsPreviewLabel"](tone)}
      </p>

      <div
        data-node-id={tone === "Friendly" ? "10:5968" : undefined}
        className="flex w-full flex-col gap-5 overflow-clip rounded-bubble border border-border bg-surface p-4"
      >
        {tone === "Friendly" ? (
          <>
            <PhoneStatus />
            <div className="flex flex-col items-center gap-1">
              <div className="flex size-9 items-center justify-center overflow-clip rounded-full bg-brand-50">
                <MessageSquare
                  className="size-[18px] text-brand-600"
                  aria-hidden="true"
                />
              </div>
              <p className="text-center text-badge font-medium text-text">
                {t["common.appName"]}
              </p>
            </div>
            <div className="h-px w-full bg-border" />
          </>
        ) : (
          <p className="text-label font-semibold text-text">
            {t["common.appName"]}
          </p>
        )}

        <p className="text-center text-eyebrow font-normal text-muted">
          {t["ui.previewSendDate"]}
        </p>

        <div
          data-node-id={tone === "Friendly" ? "10:5981" : undefined}
          className="flex w-full items-start overflow-clip rounded-[14px] bg-[#eff1ed] p-3.5"
        >
          <p className="min-w-0 flex-1 text-helper font-normal leading-6 text-text">
            {body}
          </p>
        </div>

        {tone === "Friendly" ? (
          <div className="flex w-full items-center gap-2 overflow-clip rounded-full border border-border p-2.5">
            <span className="min-w-0 flex-1 text-eyebrow font-normal text-muted">
              {t["ui.previewTextMessage"]}
            </span>
            <span
              aria-hidden="true"
              className="flex size-3.5 items-center justify-center rounded-full bg-text text-white"
            >
              <svg viewBox="0 0 14 14" width="10" height="10" fill="none">
                <path
                  d="M3 7h8M7 3l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
        ) : null}
      </div>

      <p className="text-center text-eyebrow font-normal text-muted">
        {tone === "Friendly"
          ? t["ui.previewFriendAmount"](
              t["ui.previewFriend"] as string,
              t["ui.previewAmount"] as string,
            )
          : t["ui.previewFriendDue"](
              t["ui.previewFriend"] as string,
              t["ui.previewAmount"] as string,
              t["ui.previewDueDate"] as string,
            )}
      </p>
    </div>
  );
}

function PhoneStatus() {
  return (
    <div className="flex w-full items-center justify-between">
      <p className="text-eyebrow font-semibold text-text">9:41</p>
      <div className="flex items-center gap-1 text-muted">
        <span aria-hidden="true">▮▮▮</span>
        <span aria-hidden="true">⤴</span>
        <span aria-hidden="true">▮▮</span>
      </div>
    </div>
  );
}

function EmailPreview({
  tone,
  subject,
  body,
  t,
}: {
  tone: Tone;
  subject: string;
  body: string;
  t: ReturnType<typeof useT>["t"];
}) {
  return (
    <div
      data-node-id={
        tone === "Friendly"
          ? "10:6012"
          : tone === "Neutral"
          ? "10:6240"
          : "10:6328"
      }
      className="flex w-full shrink-0 flex-col gap-4 self-stretch overflow-clip rounded-card bg-neutral-50 p-6 md:w-[360px]"
    >
      <p className="text-center text-badge font-semibold text-muted">
        {t["ui.emailPreviewLabel"](tone)}
      </p>

      <div
        data-node-id={tone === "Friendly" ? "10:6014" : undefined}
        className="flex w-full flex-col gap-5 overflow-clip rounded-input border border-border bg-surface p-5"
      >
        <p className="text-modal-heading font-semibold text-text">{subject}</p>
        <div className="flex flex-col gap-1 leading-6">
          <p className="text-label font-medium text-text">
            {t["ui.previewByline"](t["ui.previewMyName"] as string)}
          </p>
          <p className="text-eyebrow font-normal text-muted">
            {t["ui.previewTo"](t["ui.previewEmail"] as string)}
          </p>
          <p className="text-eyebrow font-normal text-muted">
            {t["ui.previewSendDate"]}
          </p>
        </div>
        <div className="h-px w-full bg-border" />
        <p className="text-body font-normal leading-6 text-text">{body}</p>
        {tone === "Friendly" ? (
          <>
            <div className="h-px w-full bg-border" />
            <p className="text-eyebrow font-normal text-muted">
              {t["ui.previewFooter"](t["ui.previewMyName"] as string)}
            </p>
          </>
        ) : null}
      </div>

      <p className="text-center text-eyebrow font-normal text-muted">
        {tone === "Friendly"
          ? t["ui.previewFriendAmount"](
              t["ui.previewFriend"] as string,
              t["ui.previewAmount"] as string,
            )
          : t["ui.previewFriendDue"](
              t["ui.previewFriend"] as string,
              t["ui.previewAmount"] as string,
              t["ui.previewDueDate"] as string,
            )}
      </p>
    </div>
  );
}

function ChannelRow({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string;
  sub: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-6">
        <p className="text-body font-medium text-text">{label}</p>
        {sub ? (
          <p className="text-helper font-normal text-muted">{sub}</p>
        ) : null}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}
