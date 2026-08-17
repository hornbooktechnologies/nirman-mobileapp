# Subscription And Capacity Contract

## Status

Approved for implementation on 2026-08-14.

## Scope

The first commercial release uses manually provisioned Organization subscriptions. All released core MVP modules are included; plans differ by configurable capacity and validity, not by Organization Role.

## Configurable Plan Model

Platform Super Admin creates plan records with:

- unique key and customer-facing name;
- active/inactive catalog status;
- optional maximum active Projects;
- optional maximum active login Members;
- optional storage allowance in bytes;
- description.

`null` capacity means unlimited. No plan names, prices, or limit numbers are hard-coded by this contract.

Each Organization may have one current subscription assignment with:

- plan;
- `PENDING`, `ACTIVE`, `SUSPENDED`, `EXPIRED`, or `CANCELLED` status;
- start and optional end timestamp;
- optional internal note;
- assigning Platform user and timestamps.

## Counting Rules

Initial deterministic rules:

- Project capacity counts `ACTIVE` Projects only.
- Member capacity counts `ACTIVE` Organization Members only.
- `INVITED` memberships do not consume capacity until activation.
- Workers never consume Member capacity and have no plan limit.
- Storage is reported but not enforced until Files And Media owns durable asset metadata and byte accounting.

These rules are configurable only through a later approved contract; they are not inferred from role names.

## Enforcement

- Organization access requires an active Organization.
- Subscription enforcement is introduced safely: an Organization without a subscription remains in legacy-compatible access until Platform Super Admin assigns one.
- Once assigned, a subscription must be `ACTIVE` and within its validity window for new commercial-capacity consumption.
- Project creation/restore to ACTIVE checks Project capacity transactionally.
- Member invitation does not consume a seat; activation and reactivation check Member capacity transactionally.
- Downgrade or expiry never deletes or automatically archives/deactivates data.
- An over-capacity Organization can read existing data but cannot create additional counted capacity.

Stable errors:

```text
SUBSCRIPTION_REQUIRED
SUBSCRIPTION_INACTIVE
PLAN_LIMIT_REACHED
PROJECT_CAPACITY_REACHED
MEMBER_CAPACITY_REACHED
STORAGE_CAPACITY_REACHED
```

## APIs And UI

Platform endpoints require `platform-subscriptions:*` and provide:

- plan list/create/update;
- Organization subscription read/assign/update;
- Organization capacity summary.

Organization Owners may read their own subscription/capacity summary but cannot change commercial values.

Initial web scope includes Platform plan/assignment administration and an Organization usage summary. Mobile receives a read-only subscription summary and clear blocking messages; it does not administer billing.

## Non-goals

- Checkout, payment gateway, invoices, billing webhooks, automatic renewal, self-service upgrade/downgrade.
- Worker limits or raw usage billing.
- Storage enforcement before Files And Media approval.
- Per-module paid entitlements for core MVP modules.

## Acceptance Criteria

- Platform Super Admin can configure a plan without code changes and assign it to an Organization.
- Active Project and Member limits are enforced without deleting existing data.
- Concurrent creates cannot exceed a configured capacity.
- Workers remain unlimited.
- Subscription errors are distinguishable from role and Project permission errors.
- Existing Organizations without a subscription are not locked out during migration.

