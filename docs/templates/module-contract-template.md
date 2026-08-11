# Module Contract Template

## 1. Status

- Draft / Approved / Superseded:
- Scope owner:
- Last updated:

This contract is documentation only until a separate implementation phase is approved.

## 2. Purpose and Business Outcome

Describe the user problem, business outcome, and why this module exists.

## 3. Actors and Responsibilities

- Web admin responsibilities:
- Mobile field responsibilities:
- API responsibilities:
- Explicit exclusions:

## 4. Approved Foundation Decisions

Every module must follow these NirmanSite MVP decisions:

- Permission keys use `resource:action`.
- Contracts live in `packages/shared` unless a later decision creates `packages/contracts`.
- Database access lives only in `apps/api` through `mysql2/promise` repositories.
- New SQL tables use plural `snake_case` names.
- Prisma under `packages/database/prisma` is archived inherited history only.
- Access is modeled through `organization_members` and `project_members`; inherited global `users.roleId` compatibility is not the target model.

## 5. Data Models

List contract-level entities, ownership, project/organisation scope, statuses, and state transitions.

## 6. Permissions and Visibility

List required `resource:action` permission keys, navigation visibility rules, forbidden behavior, and backend enforcement points.

## 7. API Endpoints

Reference endpoint contracts or list method, path, permission, request, response, and errors.

## 8. Web Routes and States

List web routes, page responsibilities, and loading, empty, error, forbidden, success states.

## 9. Mobile Routes and States

List mobile routes, field workflow responsibilities, offline/poor-network states, and project context display.

## 10. Audit, Notifications, and Evidence

List audited actions, notification triggers, evidence/media requirements, and redaction rules.

## 11. Acceptance Criteria and Tests

Include tenant isolation, project isolation, permission enforcement, workflow transitions, and client-state coverage.

## 12. Open Decisions

Only list decisions not already resolved by approved foundation decisions.
