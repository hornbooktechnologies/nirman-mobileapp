# Role-Specific Dashboards Contract

Status: implementation complete; physical-device acceptance pending.

## Purpose

Provide one fast, project-scoped mobile dashboard payload whose sections, metrics, and quick actions are derived from the active Organization Role and effective Project permissions.

## Access and isolation

- Endpoint: `GET /organizations/:organizationId/projects/:projectId/dashboard`.
- Requires an authenticated active customer Organization membership and `dashboards:read` on the Organization Role.
- The Project must be accessible through organization-wide scope or an active Project assignment.
- A CUSTOM Project grant is the ceiling for every business section and quick action.
- Platform roles receive no customer dashboard permission by default.
- No inaccessible Project data is queried or returned.

## Profiles

- `OWNER`: Organization Owner, Builder Admin, or Project Manager.
- `CONTRACTOR`: Independent Contractor Owner or Contractor Member.
- `SUPERVISOR`: Builder Supervisor or Site Supervisor.
- `SALES`: Sales User.
- `GENERAL`: any other authorized customer role.

Profiles control presentation priority only. Permissions remain the data authority.

## Response

The shared `RoleDashboardResponse` contract contains profile/project context, `availableSections`, server-derived `quickActions`, and nullable `site`, `finance`, `workflow`, `progress`, `gallery`, and `sales` sections. A missing permission returns the related section as `null`; it never returns a zero that could be mistaken for authorized data.

Money is returned as fixed two-decimal strings. Dates are ISO timestamps, with daily boundaries calculated in `Asia/Calcutta` for the MVP. Today-at-site follows the approved default-present attendance model: active assigned workers minus full/half-day absence exceptions.

## Performance

The endpoint runs independent authorized aggregates concurrently and relies on migration `023_role_specific_dashboards.sql` for high-frequency assigned-worker and sales due/assignee paths. It does not create a cache or duplicate mutable business totals.

## Mobile presentation

- Preserve the established dashboard order and project context.
- Add a role-priority command hero, dashboard-only layered blueprint background, readable live metrics, and server-derived actions.
- Use NirmanSite semantic tokens and existing operational components.
- All copy and accessibility hints must remain in English, Hindi, and Gujarati.

## Acceptance evidence

- Migration/seed: remote development target is 24/24 current; `dashboards:read` is present on nine operational customer roles and absent from platform defaults; four dashboard indexes verified.
- API: focused 2/2 unit tests, type-check, build, health/database smoke, and authenticated Organization Owner response with all six authorized sections passed.
- Mobile: type-check and 18-namespace en/hi/gu key/placeholder validation passed.
- Pending: authenticated Supervisor and Sales response matrix plus physical-device narrow/large phone, Dynamic Type, screen-reader, reduced-motion, landscape, and fluent-language review.
