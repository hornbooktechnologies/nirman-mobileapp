"use client";

import { FormEvent, useState } from "react";
import { LoadingState } from "@/components/ui";
import {
  Button,
  Card,
  Input,
  PageHeader,
} from "@/components/ui";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  useSettings,
  useUpdateSettings,
} from "@/features/settings/hooks/use-settings";
import type {
  EmailSettings,
  GeneralSettings,
} from "@/features/settings/types/settings.types";
import { settingsSectionInput } from "../settings-section-input";

const generalFields: Array<{ key: keyof GeneralSettings; label: string; type?: string }> = [
  { key: "appName", label: "App Name" },
  { key: "companyName", label: "Company Name" },
  { key: "lightLogo", label: "Light Logo URL" },
  { key: "darkLogo", label: "Dark Logo URL" },
  { key: "favicon", label: "Favicon URL" },
  { key: "supportEmail", label: "Support Email", type: "email" },
  { key: "supportPhone", label: "Support Phone" },
  { key: "companyAddress", label: "Company Address" },
];

const emailFields: Array<{
  key: keyof EmailSettings;
  label: string;
  type?: string;
  placeholder: string;
}> = [
  { key: "smtpHost", label: "SMTP Host", placeholder: "smtp.gmail.com" },
  { key: "smtpPort", label: "SMTP Port", placeholder: "587" },
  {
    key: "smtpUsername",
    label: "SMTP Username",
    placeholder: "sender@example.com",
  },
  {
    key: "smtpPassword",
    label: "SMTP Password",
    type: "password",
    placeholder: "Provider password or app password",
  },
  { key: "smtpEncryption", label: "SMTP Encryption", placeholder: "tls" },
  {
    key: "mailFromAddress",
    label: "Mail From Address",
    type: "email",
    placeholder: "sender@example.com",
  },
  {
    key: "mailFromName",
    label: "Mail From Name",
    placeholder: "NirmanSite Super Admin",
  },
];

const emptyGeneralValues = Object.fromEntries(
  generalFields.map((field) => [field.key, ""]),
) as Record<keyof GeneralSettings, string>;

const emptyEmailValues = Object.fromEntries(
  emailFields.map((field) => [field.key, ""]),
) as Record<keyof EmailSettings, string>;

export function SettingsPage() {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("platform-settings:update");
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const [generalDraft, setGeneralValues] = useState<Record<keyof GeneralSettings, string> | null>(null);
  const [emailDraft, setEmailValues] = useState<Record<keyof EmailSettings, string> | null>(null);
  const [savedGroup, setSavedGroup] = useState<"general" | "email" | null>(null);
  const [errorGroup, setErrorGroup] = useState<"general" | "email" | null>(null);
  const generalValues = generalDraft ?? { ...emptyGeneralValues, ...(settings.data ? stringifyGeneralSettings(settings.data.general) : {}) };
  const emailValues = emailDraft ?? { ...emptyEmailValues, ...(settings.data ? stringifyEmailSettings(settings.data.email) : {}) };

  async function handleSubmit(event: FormEvent<HTMLFormElement>, group: "general" | "email") {
    event.preventDefault();
    if (!canUpdate) return;
    setSavedGroup(null);
    setErrorGroup(null);
    try {
      await updateSettings.mutateAsync(settingsSectionInput(group, generalValues, emailValues));
      if (group === "general") setGeneralValues(null);
      else setEmailValues(null);
      setSavedGroup(group);
    } catch {
      setErrorGroup(group);
      // The mutation error is rendered below; preserve the current draft.
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        description="Manage application-level configuration."
      />

      <Card>
        {settings.isLoading ? (
          <LoadingState label="Loading settings" />
        ) : settings.isError ? (
          <p role="alert" className="text-sm text-danger">Unable to load settings. <Button variant="outline" onClick={() => void settings.refetch()}>Retry</Button></p>
        ) : (
          <div className="space-y-6">
            <form className="space-y-3" onSubmit={(event) => void handleSubmit(event, "general")}>
              <h2 className="text-lg font-semibold">General settings</h2>
              <p className="text-sm text-sub">Application identity and support details.</p>
              <div className="grid gap-3 md:grid-cols-2">
                {generalFields.map((field) => (
                  <label key={field.key} className="space-y-1.5">
                    <span className="text-[12px] font-medium text-sub">{field.label}</span>
                    <Input
                      type={field.type ?? "text"}
                      disabled={!canUpdate}
                      value={generalValues[field.key]}
                      onChange={(event) =>
                        setGeneralValues((current) => ({
                          ...(current ?? generalValues),
                          [field.key]: event.target.value,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
              {canUpdate && <Button type="submit" disabled={updateSettings.isPending}>{updateSettings.isPending ? "Saving" : "Save general settings"}</Button>}
              {savedGroup === "general" && <p role="status" className="text-sm text-success">General settings saved.</p>}
              {errorGroup === "general" && updateSettings.isError && <p role="alert" className="text-sm text-danger">{updateSettings.error instanceof Error ? updateSettings.error.message : "Unable to save general settings."}</p>}
            </form>

            <form className="space-y-3 border-t border-hairline pt-6" onSubmit={(event) => void handleSubmit(event, "email")}>
              <h2 className="text-lg font-semibold">Outbound email</h2>
              <p className="text-sm text-sub">Sender configuration for invitations and account messages. Saving this section does not change general settings.</p>
              <div className="grid gap-3 md:grid-cols-2">
                {emailFields.map((field) => (
                  <label key={field.key} className="space-y-1.5">
                    <span className="text-[12px] font-medium text-sub">{field.label}</span>
                    <Input
                      type={field.type ?? "text"}
                      disabled={!canUpdate}
                      placeholder={field.placeholder}
                      inputMode={field.key === "smtpPort" ? "numeric" : undefined}
                      autoComplete={field.key === "smtpPassword" ? "new-password" : "off"}
                      value={emailValues[field.key]}
                      onChange={(event) =>
                        setEmailValues((current) => ({
                          ...(current ?? emailValues),
                          [field.key]: event.target.value,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
              <p className="text-[12px] leading-5 text-sub">
                Use credentials from an outbound SMTP provider. YOPmail can receive
                test invitations, but it does not provide the sender credentials. For
                Gmail, use a newly generated 16-character App Password for the same
                account entered as SMTP Username; displayed spaces are ignored.
              </p>
              {canUpdate && <Button type="submit" disabled={updateSettings.isPending}>{updateSettings.isPending ? "Saving" : "Save email settings"}</Button>}
              {savedGroup === "email" && <p role="status" className="text-sm text-success">Email settings saved.</p>}
              {errorGroup === "email" && updateSettings.isError && <p role="alert" className="text-sm text-danger">{updateSettings.error instanceof Error ? updateSettings.error.message : "Unable to save email settings."}</p>}
            </form>
          </div>
        )}
      </Card>
    </div>
  );
}

function stringifyGeneralSettings(settings: GeneralSettings) {
  return Object.fromEntries(
    generalFields.map((field) => [field.key, settings[field.key] ?? ""]),
  ) as Record<keyof GeneralSettings, string>;
}

function stringifyEmailSettings(settings: EmailSettings) {
  return Object.fromEntries(
    emailFields.map((field) => [field.key, settings[field.key] ?? ""]),
  ) as Record<keyof EmailSettings, string>;
}
