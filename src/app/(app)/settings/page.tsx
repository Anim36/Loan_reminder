"use client";

// Settings — /settings.
//
// Five cards, in this order:
//   1. Profile     (name, phone, email, "Save changes")
//   2. Appearance  (Light / Dark / System + Language + Bangla numerals)
//   3. Notifications (3 email reminders toggles)
//   4. Security    (current / new / confirm password)
//   5. Account     (Log out, Delete account)
//
// i18n: every user-visible string is read from the dictionary. Zod
// schemas use i18n keys as their message strings; the values are
// resolved to localized text at display time.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useLang, useT } from "@/lib/i18n/LanguageProvider";
import {
  ArrowLeft,
  CircleCheck,
  Lock,
  LogOut,
  Mail,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { z } from "zod";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/components/ui/toast-provider";
import { Modal } from "@/components/ui/modal";
import { CardHeading, FieldLabel } from "@/components/layout/text";
import { PageHeader } from "@/components/layout/page-header";
import { useSessionUser } from "@/hooks/use-session-user";
import {
  changePassword as changePasswordApi,
  deleteAccount as deleteAccountApi,
  signOut,
} from "@/services/authService";
import { useUserSettings, type ThemeChoice } from "@/services";

export default function SettingsPage() {
  const router = useRouter();
  const toast = useToast();
  const { theme: themeValue, setTheme } = useTheme();
  const {
    settings,
    ready,
    updateProfile,
    updateTheme: saveTheme,
    updateBanglaNumerals,
    updateNotificationPrefs,
  } = useUserSettings();
  const { t, setLang } = useT();
  const uiLang = useLang();
  const { user: sessionUser } = useSessionUser();

  // ---- Session-derived profile (the source of truth) -----------------
  // `useUserSettings` still owns the localStorage copy, but the
  // user's *real* name and email live on the server. We prefer
  // the session value when the localStorage copy is the demo
  // seed ("Ayesha" / "ayesha@example.com") OR matches the
  // session — i.e. when there's no user-edited override. Once
  // the user saves a new value it persists in localStorage and
  // we read it from there.
  const sessionName = sessionUser?.name ?? null;
  const sessionEmail = sessionUser?.email ?? null;
  const isDemoSeed =
    settings.displayName === "Ayesha" &&
    settings.email === "ayesha@example.com";
  const profileName =
    sessionName && (isDemoSeed || settings.displayName === sessionName)
      ? sessionName
      : settings.displayName;
  const profileEmail =
    sessionEmail && (isDemoSeed || settings.email === sessionEmail)
      ? sessionEmail
      : settings.email;

  // ---- Profile zod schema (i18n keys) -----------------------------------
  const profileSchema = z.object({
    displayName: z.string().trim().min(2, "settings.fieldRequired"),
    phone: z
      .string()
      .trim()
      .regex(/^1[3-9]\d{8}$/, "settings.fieldInvalid"),
    email: z.string().trim().email("settings.fieldInvalid"),
  });
  const passwordSchema = z
    .object({
      currentPassword: z.string().min(1, "settings.passwordCurrentRequired"),
      newPassword: z.string().min(8, "settings.passwordTooShort"),
      confirmPassword: z.string(),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
      message: "settings.passwordMismatch",
      path: ["confirmPassword"],
    });

  function resolveError(key: string): string {
    return (t as unknown as Record<string, string>)[key] ?? key;
  }

  // Theme
  const theme = settings.theme ?? (themeValue as ThemeChoice | undefined) ?? "system";
  useEffect(() => {
    if (!ready) return;
    const value = settings.theme;
    if (value === "system") {
      const prefersDark =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
    } else {
      setTheme(value);
    }
  }, [ready, settings.theme, setTheme]);

  function handleThemePick(next: ThemeChoice) {
    void saveTheme(next);
    if (next === "system") {
      const prefersDark =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
    } else {
      setTheme(next);
    }
  }

  // Profile form state. We hold the seeded value alongside the
  // user's edit so we can swap between them on every render (rather
  // than running an effect to copy server state into local state,
  // which trips `react-hooks/set-state-in-effect`).
  //
  // `seeded` is the ref-based "have we copied from the server yet"
  // signal; once the user types into a field we never overwrite it.
  const [name2, setName2] = useState(profileName);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(profileEmail);
  const [profileErrors, setProfileErrors] = useState<{
    displayName?: string;
    phone?: string;
    email?: string;
  }>({});
  const [profileBusy, setProfileBusy] = useState(false);
  // `userTouched` is the once-per-field "the user has edited this"
  // flag. A `useState` (not a ref) because the value drives the
  // render of the inputs' value below, and React's lint rules
  // disallow reading refs during render. The state is only mutated
  // in event handlers, never inside an effect, so
  // `react-hooks/set-state-in-effect` stays happy.
  const [userTouched, setUserTouched] = useState<{
    name: boolean;
    phone: boolean;
    email: boolean;
  }>({ name: false, phone: false, email: false });

  // Sync upstream `settings` into local state during render. We
  // don't touch a field the user has already touched so their input
  // is preserved. The "computation" branch is the
  // [React-recommended](https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  // way to do this without triggering the "setState in effect" rule.
  if (ready) {
    if (!userTouched.name && name2 !== profileName) {
      setName2(profileName);
    }
    if (!userTouched.phone && phone !== settings.phone) {
      setPhone(settings.phone);
    }
    if (!userTouched.email && email !== profileEmail) {
      setEmail(profileEmail);
    }
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    const result = profileSchema.safeParse({
      displayName: name2,
      phone,
      email,
    });
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      setProfileErrors({
        displayName: flat.displayName?.[0]
          ? resolveError(flat.displayName[0])
          : undefined,
        phone: flat.phone?.[0] ? resolveError(flat.phone[0]) : undefined,
        email: flat.email?.[0] ? resolveError(flat.email[0]) : undefined,
      });
      return;
    }
    setProfileErrors({});
    setProfileBusy(true);
    try {
      await updateProfile(result.data);
      toast.show(t["settings.profileSavedToast"]);
    } finally {
      setProfileBusy(false);
    }
  }

  async function togglePref(key: keyof typeof settings.notifications) {
    await updateNotificationPrefs({ [key]: !settings.notifications[key] });
  }

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwErrors, setPwErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [pwBusy, setPwBusy] = useState(false);

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    const result = passwordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      setPwErrors({
        currentPassword: flat.currentPassword?.[0]
          ? resolveError(flat.currentPassword[0])
          : undefined,
        newPassword: flat.newPassword?.[0]
          ? resolveError(flat.newPassword[0])
          : undefined,
        confirmPassword: flat.confirmPassword?.[0]
          ? resolveError(flat.confirmPassword[0])
          : undefined,
      });
      return;
    }
    setPwErrors({});
    setPwBusy(true);
    try {
      await changePasswordApi({
        current: result.data.currentPassword,
        next: result.data.newPassword,
      });
      toast.show(t["settings.passwordChanged"]);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwErrors({
        newPassword:
          err instanceof Error ? err.message : t["settings.passwordRequired"],
      });
    } finally {
      setPwBusy(false);
    }
  }

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleDeleteAccount() {
    setDeleteBusy(true);
    try {
      await deleteAccountApi();
      setDeleteOpen(false);
      toast.show(t["settings.accountDeleted"]);
      router.push("/login");
      router.refresh();
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <section className="flex w-full flex-col gap-6 p-6">
      <PageHeader
        eyebrow={t["ui.settings.eyebrow"]}
        title={t["ui.settings.title"]}
        subtitle={t["ui.settings.subtitle"]}
      />

      {/* Profile */}
      <Card
        icon={<UserIcon size={16} className="text-muted" />}
        title={t["ui.settings.profile.title"]}
      >
        <div className="flex items-center gap-4">
          <Avatar name={name2 || settings.displayName || "A"} size={56} />
          <div className="flex min-w-0 flex-1 flex-col leading-[1.5]">
            <p className="font-medium text-text text-list-title truncate">
              {name2 || t["settings.namePlaceholder"]}
            </p>
            <p className="font-normal text-helper text-muted truncate">{email}</p>
          </div>
        </div>

        <form
          onSubmit={handleProfileSave}
          noValidate
          className="flex w-full flex-col gap-4"
        >
          <Field
            id="profile-name"
            label={t["settings.displayName"]}
            value={name2}
            onChange={(v) => {
              setName2(v);
              setUserTouched((d) => (d.name ? d : { ...d, name: true }));
            }}
            error={profileErrors.displayName}
            placeholder={t["settings.namePlaceholder"]}
          />
          <Field
            id="profile-phone"
            label={t["settings.phoneLabel"]}
            prefix="+880"
            value={phone}
            onChange={(v) => {
              setPhone(v);
              setUserTouched((d) => (d.phone ? d : { ...d, phone: true }));
            }}
            error={profileErrors.phone}
            placeholder={t["settings.phonePlaceholder"]}
          />
          <Field
            id="profile-email"
            label={t["settings.emailLabel"]}
            value={email}
            onChange={(v) => {
              setEmail(v);
              setUserTouched((d) => (d.email ? d : { ...d, email: true }));
            }}
            error={profileErrors.email}
            placeholder={t["settings.emailPlaceholder"]}
            type="email"
          />
          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={profileBusy}>
              {profileBusy ? t["ui.settings.saving"] : t["settings.save"]}
            </Button>
          </div>
        </form>
      </Card>

      {/* Appearance */}
      <Card
        icon={<CircleCheck size={16} className="text-muted" />}
        title={t["ui.settings.appearance.title"]}
        description={t["ui.settings.appearanceDesc"]}
      >
        <div className="flex flex-col gap-3">
          <FieldLabel>{t["settings.theme"]}</FieldLabel>
          <div
            role="radiogroup"
            aria-label={t["settings.aria.themeGroup"]}
            className="flex items-stretch gap-[4px] p-[4px] rounded-input bg-neutral-50 w-full max-w-md"
          >
            {(["light", "dark", "system"] as const).map((opt) => {
              const active = theme === opt;
              const label =
                opt === "light"
                  ? t["settings.theme.light"]
                  : opt === "dark"
                    ? t["settings.theme.dark"]
                    : t["settings.theme.system"];
              return (
                <button
                  key={opt}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={t["settings.themeOptionAria"](label)}
                  onClick={() => handleThemePick(opt)}
                  className={[
                    "flex-1 min-w-0 px-[8px] py-[9px] rounded-[9px] text-center whitespace-nowrap",
                    active
                      ? "bg-surface shadow-card font-semibold text-helper text-brand-600"
                      : "bg-transparent font-normal text-helper text-muted hover:text-text",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="text-helper font-normal text-muted">
            {t["settings.themeHelper"]}
          </p>
        </div>

        <hr className="my-2 border-border" />

        <div className="flex flex-col gap-3">
          <FieldLabel>{t["ui.settings.language.title"]}</FieldLabel>
          <div
            role="radiogroup"
            aria-label={t["ui.settings.language.label"]}
            className="flex items-stretch gap-[4px] p-[4px] rounded-input bg-neutral-50 w-full max-w-md"
          >
            {(
              [
                { value: "en" as const, label: "English" },
                { value: "bn" as const, label: "বাংলা" },
              ]
            ).map((opt) => {
              const active = uiLang === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setLang(opt.value)}
                  className={[
                    "flex-1 min-w-0 px-[8px] py-[9px] rounded-[9px] text-center whitespace-nowrap",
                    active
                      ? "bg-surface shadow-card font-semibold text-helper text-brand-600"
                      : "bg-transparent font-normal text-helper text-muted hover:text-text",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="text-helper font-normal text-muted">
            {t["ui.settings.language.helper"]}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Toggle
            checked={settings.banglaNumerals}
            onChange={(v) => void updateBanglaNumerals(v)}
          />
          <div className="flex flex-col gap-0.5">
            <p className="text-helper font-medium text-text">
              {t["settings.banglaNumerals"]}
            </p>
            <p className="text-helper font-normal text-muted">
              {t["settings.banglaNumeralsHelper"]}
            </p>
          </div>
        </div>

        <div>
          <Link
            href="/reports"
            className="inline-flex items-center gap-1.5 text-helper font-semibold text-brand-600 hover:underline"
          >
            {t["settings.reportsLink"]}
          </Link>
        </div>
      </Card>

      {/* Notifications */}
      <Card
        icon={<Mail size={16} className="text-muted" />}
        title={t["ui.settings.notifications.title"]}
        description={t["ui.settings.notificationsDesc"]}
      >
        <ToggleRow
          label={t["settings.notifEmailOnPaid"]}
          sub=""
          checked={settings.notifications.emailOnPaid}
          onChange={() => void togglePref("emailOnPaid")}
        />
        <ToggleRow
          label={t["settings.notifEmailOnOverdue"]}
          sub=""
          checked={settings.notifications.emailOnOverdue}
          onChange={() => void togglePref("emailOnOverdue")}
        />
        <ToggleRow
          label={t["settings.notifWeeklySummary"]}
          sub=""
          checked={settings.notifications.weeklySummary}
          onChange={() => void togglePref("weeklySummary")}
        />
      </Card>

      {/* Security */}
      <Card
        icon={<Lock size={16} className="text-muted" />}
        title={t["ui.settings.security.title"]}
        description={t["ui.settings.securityDesc"]}
      >
        <form
          onSubmit={handlePasswordSave}
          noValidate
          className="flex w-full flex-col gap-4"
        >
          <Field
            id="pw-current"
            label={t["settings.currentPassword"]}
            type="password"
            value={currentPassword}
            onChange={setCurrentPassword}
            error={pwErrors.currentPassword}
            autoComplete="current-password"
          />
          <Field
            id="pw-new"
            label={t["settings.newPassword"]}
            type="password"
            value={newPassword}
            onChange={setNewPassword}
            error={pwErrors.newPassword}
            autoComplete="new-password"
          />
          <Field
            id="pw-confirm"
            label={t["settings.confirmPassword"]}
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            error={pwErrors.confirmPassword}
            autoComplete="new-password"
          />
          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={pwBusy}>
              {pwBusy ? t["ui.settings.saving"] : t["settings.save"]}
            </Button>
          </div>
        </form>
      </Card>

      {/* Account */}
      <Card
        icon={<LogOut size={16} className="text-muted" />}
        title={t["ui.settings.account.title"]}
        description={t["ui.settings.accountDesc"]}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-body text-text">{t["ui.settings.signOut"]}</p>
          <Button
            variant="secondary"
            icon={<LogOut size={16} aria-hidden />}
            onClick={() => void handleSignOut()}
          >
            {t["ui.settings.logOut"]}
          </Button>
        </div>
        <div className="h-px w-full bg-border" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-col leading-[1.5]">
            <p className="text-body text-text">{t["settings.deleteAccount"]}</p>
            <p className="font-normal text-helper text-muted">
              {t["settings.deleteAccountBody"]}
            </p>
          </div>
          <Button
            variant="destructive"
            icon={<Trash2 size={16} aria-hidden />}
            onClick={() => setDeleteOpen(true)}
          >
            {t["settings.deleteAccount"]}
          </Button>
        </div>
      </Card>

      <Link
        href="/dashboard"
        className="inline-flex w-fit items-center gap-1.5 text-helper font-normal text-muted hover:text-text"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        {t["ui.backToDashboard"]}
      </Link>

      {!ready ? <span className="sr-only">{t["ui.loadingSettings"]}</span> : null}

      <Modal
        open={deleteOpen}
        onClose={() => (deleteBusy ? null : setDeleteOpen(false))}
        title={t["settings.deleteAccountTitle"]}
        description={t["settings.deleteWarning"]}
        primaryLabel={deleteBusy ? t["settings.deleteAccountConfirm"] : t["settings.deleteAccount"]}
        secondaryLabel={t["settings.cancelDelete"]}
        onPrimary={() => void handleDeleteAccount()}
        onSecondary={() => setDeleteOpen(false)}
      />
    </section>
  );
}

/* --------------------------------------------------------------------------
 * Local primitives
 * -------------------------------------------------------------------------- */

function Card({
  icon,
  title,
  description,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card md:p-8">
      <header className="flex items-start gap-3">
        {icon ? (
          <span className="flex size-9 items-center justify-center rounded-input bg-neutral-50">
            {icon}
          </span>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col leading-[1.4]">
          <CardHeading>{title}</CardHeading>
          {description ? (
            <p className="font-normal text-helper text-muted">{description}</p>
          ) : null}
        </div>
      </header>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  helperText,
  prefix,
  placeholder,
  type = "text",
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  helperText?: string;
  prefix?: string;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-medium text-label text-text">
        {label}
      </label>
      <div
        className={[
          "w-full h-[48px] px-[14px] flex items-center gap-[10px] rounded-input border bg-surface overflow-hidden font-normal text-body",
          error
            ? "border border-status-overdue-text"
            : "border border-border focus-within:border-2 focus-within:border-brand-600 focus-within:shadow-focus",
        ].join(" ")}
      >
        {prefix ? (
          <span className="shrink-0 font-normal text-body text-muted whitespace-nowrap">
            {prefix}
          </span>
        ) : null}
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent outline-none font-normal text-body text-text placeholder:text-placeholder"
        />
      </div>
      {error ? (
        <p className="font-normal text-helper text-status-overdue-text">
          {error}
        </p>
      ) : helperText ? (
        <p className="font-normal text-helper text-muted">{helperText}</p>
      ) : null}
    </div>
  );
}

function ToggleRow({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string;
  sub: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center gap-4 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.5]">
        <p className="text-body font-medium text-text">{label}</p>
        {sub ? <p className="text-helper font-normal text-muted">{sub}</p> : null}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}