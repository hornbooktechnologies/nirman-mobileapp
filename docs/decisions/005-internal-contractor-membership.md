# Decision 005: Internal Contractor Membership For Builder Projects

## Status

Approved on 2026-08-12.

## Decision

For MVP, a Builder does not connect a separate Contractor organization to a Builder-owned project. The Builder Organization Owner invites the hired person into the Builder organization with the `Contractor Member` role and assigns that membership to the relevant Builder-owned projects.

A Contractor who independently subscribes to NirmanSite owns a separate `CONTRACTOR` organization as `Independent Contractor Owner`. That Owner may create projects and invite Supervisors or other staff into the Contractor organization.

The same NirmanSite identity may therefore have different memberships in different organizations:

```text
Contractor organization -> Independent Contractor Owner
Builder organization    -> Contractor Member
```

Permissions, project access, records, and operating-profile responsibilities are always resolved from the active organization membership. No membership or project access crosses organization boundaries automatically.

## Consequences

- Builder-owned workers and operational records remain in the Builder organization.
- Contractor-owned workers and operational records remain in the Contractor organization.
- A Supervisor who needs access to a Builder project must be invited into the Builder organization and assigned to that project.
- Cross-organization project sharing, automatic staff propagation, and shared ownership are deferred beyond this MVP model.
- Mobile must support organization switching for identities with multiple active memberships before this model is considered complete.

