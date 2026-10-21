"use client";

import { useActionState } from "react";
import { activateAccount } from "./actions";
import type { Invitation } from "./service";
import { styles } from "./styles";

export function ActivationForm({
  token,
  invitation,
}: {
  token: string;
  invitation: Invitation;
}) {
  const [state, action, pending] = useActionState(
    activateAccount.bind(null, token),
    { success: false, error: "" },
  );
  if (state.success)
    return (
      <div className={styles.stack} role="status">
        <h1>Account activated</h1>
        <p>
          You’re ready to access {invitation.organization.name}. Open NirmanSite
          and sign in with your email and password.
        </p>
        <a className={styles.primary} href="nirmansite://login">
          Open NirmanSite app
        </a>
      </div>
    );

  return (
    <div className={styles.stack}>
      <h1>
        {invitation.requiresPasswordSetup
          ? "Activate your account"
          : "Join your organization"}
      </h1>
      <p>
        {invitation.owner.name}, you’re invited as{" "}
        <strong>{invitation.roleName}</strong> for{" "}
        <strong>{invitation.organization.name}</strong>.
      </p>
      <p className={styles.email}>
        Login email: <strong>{invitation.owner.email}</strong>
      </p>
      <form action={action} className={styles.stack}>
        <fieldset disabled={pending} className={styles.stack}>
          {invitation.requiresPasswordSetup ? (
            <>
              <label>
                Create password
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  aria-describedby="password-help"
                />
              </label>
              <p id="password-help" className={styles.hint}>
                Use at least 8 characters.
              </p>
              <label>
                Confirm password
                <input
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
            </>
          ) : (
            <p>
              Your existing password stays the same. Confirm below to activate
              access to this organization.
            </p>
          )}
          {state.error && <p role="alert">{state.error}</p>}
          <button
            className={styles.primary}
            type="submit"
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? "Activating account…" : "Activate account"}
          </button>
        </fieldset>
      </form>
      {!pending && (
        <a
          className={styles.secondary}
          href={`nirmansite://activate?token=${encodeURIComponent(token)}`}
        >
          Open in installed app instead
        </a>
      )}
      <p className={styles.hint}>
        The app link opens NirmanSite if it’s installed on this device. You can
        also complete activation here.
      </p>
    </div>
  );
}
