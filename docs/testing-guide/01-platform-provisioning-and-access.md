# 01 — Platform Provisioning and Access

## What this chapter covers

This is the start of every customer journey. A Platform Super Admin provisions a customer organisation, gives its primary Owner an activation invitation, optionally assigns a subscription, and confirms that access stays separated between organisations.

**Important boundary:** Platform Super Admin is a platform role. It must not become the Owner or member of the customer organisation merely by creating it.

## Roles and prerequisites

| Item | Required condition |
| --- | --- |
| Platform user | Sign in as `Platform Super Admin` / `Super Admin` with required platform permissions. |
| Test Owner | Use a test email address that can receive an activation email, or use the secure manual activation link shown after creation. |
| Test environment | Dedicated non-production environment and no real passwords in evidence. |
| Organisations | Use at least two: `Nirman Test Builder` and `Nirman Test Contractor`. |

## The lifecycle

```text
Platform Super Admin creates organisation + primary Owner invitation
  → organisation is DRAFT
  → Owner opens one-time activation link and creates/uses credentials
  → membership and organisation become active
  → Owner creates or receives projects and members
  → authorised users operate only inside their assigned organisation/projects
```

## Test cases

### PA-01 — Create a customer organisation and primary Owner invitation

**Role:** Platform Super Admin  
**Precondition:** no existing test organisation with the same intended name.

1. Open **Organizations** in the web administration area.
2. Select **New Organization**.
3. Enter the organisation name, type, supported operating profile, timezone, and primary Owner name, email, and mobile number.
4. Submit the form.

**Expected result**

- The organisation is created in `DRAFT` status.
- A primary Owner invitation is created.
- The screen displays web and mobile activation links plus an expiry time.
- If e-mail delivery works, the Owner receives an activation invitation. If it does not, use the displayed secure fallback link; do not create or send a password yourself.
- The Platform Super Admin has not been added as a customer organisation member.

**Capture:** creation form, success card with redacted link, and the organisation list showing `DRAFT`.

### PA-02 — Activate the primary Owner

**Role:** invited Owner  
**Precondition:** valid, unused invitation from PA-01.

1. Open the web or mobile activation link.
2. Verify the displayed owner name, organisation, and role before entering a password.
3. Complete activation, then sign in.

**Expected result**

- The Owner can create their own password when this is a new identity; an existing identity follows the existing-account path.
- The invitation becomes unusable after acceptance.
- The Owner membership becomes `ACTIVE`; the organisation becomes `ACTIVE`.
- The Owner sees their authorised organisation context, not platform administration menus unless separately entitled as a platform user.

**Negative checks:** missing token, altered token, expired link, and a previously accepted link must return a clear error and must not activate another account.

### PA-03 — Add an organisation member

**Role:** active Owner or authorised organisation administrator.

1. Open the organisation’s **Members** area.
2. Invite a test Supervisor or Sales user with a role, contact details, and either organisation-wide project access or selected project access.
3. Activate the invitation with that user.

**Expected result**

- The invitation creates an `INVITED` membership and becomes `ACTIVE` after acceptance.
- The member sees only modules granted by their role and only projects granted by membership/assignment.
- An invited member does not consume active-member subscription capacity until activation.

### PA-04 — Verify organisation and project isolation

**Roles:** Owner A, Owner B, restricted Supervisor.

1. Create or activate a second test organisation.
2. Create a project and worker only in Organisation A.
3. Sign in as Organisation B’s Owner and as a Supervisor restricted to one project in Organisation A.

**Expected result**

- Organisation B cannot list, open, search, edit, or infer Organisation A’s projects, workers, financial records, or members.
- The restricted Supervisor cannot access an unassigned project in Organisation A.
- Hiding a menu item is not sufficient: opening an unauthorised route or API-driven screen must also be denied.

### PA-05 — Deactivate a member

**Role:** authorised Owner/administrator.

1. Deactivate an active test member.
2. Ask the member to refresh or sign in again.

**Expected result**

- The member loses organisation and project access.
- Existing assignments remain historical records but no longer grant live access.
- The Owner cannot accidentally remove the primary Owner through normal member administration.

## Subscription and capacity tests

### PA-06 — Create a subscription plan and assign it

**Role:** Platform Super Admin with `platform-subscriptions:read` and `platform-subscriptions:update`.

1. Open **Subscriptions**.
2. Create a plan with a unique key/name, active status, and a small active-project and active-member limit.
3. Assign it to the active test organisation with an `ACTIVE` status and valid dates.

**Expected result**

- The plan is available for assignment without code changes.
- The organisation’s subscription summary shows the plan and current usage.
- The Owner can read their summary but cannot change commercial values.

### PA-07 — Verify capacity enforcement without data loss

1. With a one-project limit, create the first active project.
2. Attempt to create or restore another active project.
3. With a one-member limit, activate one member and attempt to activate another.
4. Set the subscription to inactive/expired in the test environment and attempt a new counted action.

**Expected result**

- Existing data remains readable; it is not deleted or auto-archived.
- A capacity breach returns a clear capacity error such as `PROJECT_CAPACITY_REACHED` or `MEMBER_CAPACITY_REACHED`.
- An inactive subscription blocks new commercial-capacity consumption with a distinguishable subscription error.
- Workers do not consume member capacity.
- An organisation with no subscription remains legacy-compatible until an assignment exists.

## Screenshot capture list

| Capture ID | Screen/state | Required role |
| --- | --- | --- |
| `01-PA-01` | Organisations list | Platform Super Admin |
| `01-PA-02` | New organisation form | Platform Super Admin |
| `01-PA-03` | Draft organisation and redacted invitation success | Platform Super Admin |
| `01-PA-04` | Owner activation | Invited Owner |
| `01-PA-05` | Members invite form and active member list | Owner |
| `01-PA-06` | Subscription plan/assignment and capacity summary | Platform Super Admin / Owner |
| `01-PA-07` | Permission or capacity-blocked state | Restricted test user |
