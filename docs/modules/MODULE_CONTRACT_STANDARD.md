# Module Contract Standard

> Status: mandatory standard for new mature NirmanSite business-module contracts.
>
> Applies to: database, shared contracts, API, web, mobile, permissions, offline behavior, notifications, audit logging, tests, and documentation.

## Contract Rules

1. The current repository is the technical source of truth.
2. `MVP_REQUIREMENTS.md` and approved decision records are the business source of truth.
3. Contracts must use `resource:action` permission keys.
4. New SQL tables must use plural `snake_case` names unless an approved compatibility reason says otherwise.
5. Active persistence is API-local `mysql2/promise`; archived Prisma files must not drive new implementation.
6. Web and mobile share contracts through `packages/shared`, not React components.
7. Mobile is the primary field product; web is admin, oversight, correction, imports, reports, and back-office.
8. Do not implement from a contract while unresolved product decisions affect data integrity, finance, approvals, identity, tenant isolation, or offline sync.
9. Do not create shallow CRUD-only modules. Contracts must describe real workflows, states, validations, failures, and corrections.
10. Every contract must separate confirmed facts, repository-derived facts, safe technical decisions, unresolved business decisions, and deferred functionality.

## Required Sections

Every mature module contract must contain all sections below.

### A. Module Identity

Define:

- module name
- business purpose
- target users
- business value
- included scope
- excluded or deferred scope
- dependencies
- downstream modules that depend on it

### B. Domain Terminology

Define all important terms.

Clearly distinguish similarly named concepts, including:

- system user
- employee
- worker or labourer
- contractor
- agency or subcontractor
- project assignment
- employment status
- attendance status
- payment status

### C. Actors And Permissions

For every applicable actor, define:

- permitted actions
- visible data
- restricted data
- project scope
- tenant scope
- creation rights
- editing rights
- approval rights
- deletion or archive rights
- export or report rights

Cover Builder, Contractor, Supervisor, Agency, Sales, custom roles, and Super Admin where relevant.

### D. Business Workflows

Document workflows, not CRUD labels.

For every workflow define:

- starting condition
- actor
- action
- validation
- resulting state
- notifications
- audit event
- failure paths
- reversal or correction rules
- offline behavior
- concurrency behavior

Use explicit state transitions where the module has statuses.

### E. Domain Model

For every entity define:

- purpose
- fields
- data type
- required or optional status
- default value
- allowed values
- relationships
- uniqueness rules
- tenant key
- project key
- creator and updater tracking
- timestamps
- soft-delete or archival behavior
- offline-sync identifier requirements
- indexes
- data-retention considerations

Database names must follow actual repository conventions.

### F. Shared Application Contract

Define framework-neutral shared contracts for:

- enums
- constants
- create input
- update input
- filters
- sorting
- pagination
- detail response
- list response
- summary response
- error codes
- permission keys
- state-transition commands

These must be usable by API, web, and mobile.

### G. API Contract

For each operation define:

- method
- route
- permission
- actor limitations
- request parameters
- query parameters
- request body
- response
- validation errors
- not-found behavior
- conflict behavior
- tenant enforcement
- project-access enforcement
- audit requirements
- notification requirements
- idempotency or retry considerations
- offline-sync considerations

### H. Web-Admin Experience

Define:

- routes
- list screen
- detail screen
- create/edit experience
- filters
- search
- sorting
- pagination
- bulk actions
- status actions
- confirmation dialogs
- empty states
- loading states
- error states
- permission-restricted states
- responsive behavior
- accessibility
- dashboard widgets
- reports or exports

Follow the established NirmanSite web design system.

### I. Mobile Experience

Define:

- role availability
- navigation entry
- dashboard entry points
- list or cards
- forms
- quick actions
- one-handed operation
- minimum touch targets
- loading states
- empty states
- error states
- offline states
- pending-sync states
- conflict states
- success feedback
- field usability
- low-end Android considerations

Follow the existing mobile design direction:

- premium SaaS quality
- warm background
- blueprint-blue surfaces
- construction-orange primary actions
- dark-coffee typography
- large rounded cards
- strong contrast
- large controls
- simple field-first flows
- no dense desktop tables copied into mobile

### J. Offline And Synchronisation Contract

Where the module is used in the field, define:

- data readable offline
- actions allowed offline
- local identifiers
- queued mutations
- retry behavior
- duplicate prevention
- conflict resolution
- server-authoritative fields
- last-write-wins fields
- deleted-record handling
- attachment behavior
- sync status shown to users
- failure recovery

Do not claim offline implementation unless the repository has the required infrastructure or the implementation plan includes it.

### K. Notifications

For each notification define:

- trigger
- recipient
- title
- message intent
- reference entity
- deep link
- duplicate prevention
- read state
- delivery channels in MVP
- deferred channels

### L. Audit Events

For each critical action define:

- event or action name
- actor
- entity
- old values
- new values
- metadata
- IP or device context if supported
- immutability expectation

Financial, approval, and status-transition actions must be auditable.

### M. Validation And Business Rules

Include:

- required fields
- ranges
- date rules
- uniqueness
- duplicate handling
- cross-field validation
- immutable fields
- editable states
- deletion restrictions
- tenant restrictions
- project restrictions
- financial consistency
- concurrency protections
- edge cases

### N. Reporting And Analytics

Define:

- required summaries
- dashboard metrics
- date-range reports
- project-level totals
- worker/user-level totals
- financial totals
- export requirements
- future analytics dependencies

### O. Security And Privacy

Define:

- tenant isolation
- project access
- permission enforcement
- sensitive fields
- document access
- API mass-assignment prevention
- untrusted client fields
- audit coverage
- data exposure restrictions

### P. Acceptance Criteria

Write testable criteria grouped by:

- database
- API
- permissions
- tenant isolation
- web
- mobile
- offline
- notifications
- audit
- reports
- accessibility
- performance
- regression protection

### Q. Test Matrix

Require:

- unit tests
- service tests
- API integration tests
- permission tests
- tenant-isolation tests
- state-transition tests
- validation tests
- conflict tests
- web component tests
- mobile component tests
- end-to-end happy path
- end-to-end failure paths
- offline/sync tests where applicable

### R. Open Questions And Decisions

Separate:

- confirmed requirements
- repository-derived facts
- safe technical decisions
- unresolved business decisions
- deferred functionality

Never hide ambiguity inside implementation assumptions.
