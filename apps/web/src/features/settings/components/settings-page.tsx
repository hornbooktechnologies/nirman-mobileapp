"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Button,
  Card,
  Input,
  NotificationBanner,
  PageHeader,
} from "@/components/ui";
import { PermissionGuard } from "@/features/user-management/components/permission-guard";
import {
  useSettings,
  useUpdateSettings,
} from "@/features/settings/hooks/use-settings";
import type {
  EmailSettings,
  GeneralSettings,
  UpdateSettingsInput,
} from "@/features/settings/types/settings.types";

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
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const [generalValues, setGeneralValues] = useState(emptyGeneralValues);
  const [emailValues, setEmailValues] = useState(emptyEmailValues);

  useEffect(() => {
    if (!settings.data) return;
    setGeneralValues({
      ...emptyGeneralValues,
      ...stringifyGeneralSettings(settings.data.general),
    });
    setEmailValues({
      ...emptyEmailValues,
      ...stringifyEmailSettings(settings.data.email),
    });
  }, [settings.data]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: UpdateSettingsInput = {
      general: generalValues,
      email: emailValues,
    };
    updateSettings.mutate(input);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        description="Manage application-level configuration."
      />

      <Card>
        {settings.isLoading ? (
          <p className="text-[13px] text-body">Loading settings</p>
        ) : settings.isError ? (
          <p className="text-[13px] text-red-600">Unable to load settings</p>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <section className="space-y-3">
              <h2 className="text-[18px] font-medium text-body">General</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {generalFields.map((field) => (
                  <label key={field.key} className="space-y-1.5">
                    <span className="text-[12px] font-medium text-sub">{field.label}</span>
                    <Input
                      type={field.type ?? "text"}
                      value={generalValues[field.key]}
                      onChange={(event) =>
                        setGeneralValues((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-[18px] font-medium text-body">Email</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {emailFields.map((field) => (
                  <label key={field.key} className="space-y-1.5">
                    <span className="text-[12px] font-medium text-sub">{field.label}</span>
                    <Input
                      type={field.type ?? "text"}
                      placeholder={field.placeholder}
                      inputMode={field.key === "smtpPort" ? "numeric" : undefined}
                      autoComplete={field.key === "smtpPassword" ? "new-password" : "off"}
                      value={emailValues[field.key]}
                      onChange={(event) =>
                        setEmailValues((current) => ({
                          ...current,
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
            </section>

            <PermissionGuard permission="platform-settings:update">
              <div className="space-y-3">
                <Button type="submit" disabled={updateSettings.isPending}>
                  {updateSettings.isPending ? "Saving" : "Save Settings"}
                </Button>
                {updateSettings.isSuccess ? (
                  <NotificationBanner
                    title="Settings saved"
                    description="General and email settings were updated successfully."
                    variant="success"
                  />
                ) : null}
                {updateSettings.isError ? (
                  <NotificationBanner
                    title="Unable to save settings"
                    description={
                      updateSettings.error instanceof Error
                        ? updateSettings.error.message
                        : "Please review the values and try again."
                    }
                    variant="danger"
                  />
                ) : null}
              </div>
            </PermissionGuard>
          </form>
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
