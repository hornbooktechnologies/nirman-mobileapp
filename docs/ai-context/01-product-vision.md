# Product Vision

> Historical scope note: this early Builder-focused vision is superseded where it conflicts with `MVP_REQUIREMENTS.md` and `docs/decisions/006-subscription-capacity-supervisor-commercial-provisioning.md`. Current product planning treats Builder and Independent Contractor Organizations as primary customers and does not price roles or core MVP modules separately at launch.

NirmanSite is a Builder SaaS platform for real estate developers, construction companies, and their back-office teams.

The long-term product should help builders manage the full operational journey from project setup to customer booking, document tracking, site progress, payment follow-up, and internal approvals.

## Target Users

- Builder owners and directors who need portfolio-level visibility.
- Admin and back-office staff who maintain master data, customers, documents, and approvals.
- Sales teams who manage leads, bookings, units, payment follow-ups, and customer communication.
- Project managers who track project, tower, floor, unit, contractor, and site progress.
- Site engineers and supervisors who capture progress, issues, checklists, photos, and daily updates from the field.
- Finance teams who track demand notes, receipts, dues, refunds, and payment status.
- Customer service teams who respond to customer requests and document requirements.
- External auditors or consultants who may need restricted read-only access in later phases.

## User Roles

Initial roles should be defined in shared permission planning before implementation:

- `super-admin`: Platform owner with full system access.
- `builder-owner`: Organization-level owner for one builder company.
- `admin`: Back-office administrator for company setup and operational control.
- `sales-manager`: Sales workflow owner with customer, booking, inventory, and reporting access.
- `sales-executive`: Lead, customer, unit, and follow-up user with limited permissions.
- `project-manager`: Project execution owner with site progress, task, contractor, and issue access.
- `site-engineer`: Mobile-first site user for updates, photos, checklists, and task status.
- `finance-manager`: Payment, demand, receipt, and dues workflow owner.
- `customer-support`: Customer requests, documents, and service workflow user.
- `viewer`: Restricted read-only role for reports or audits.

## Core Modules

- Organization and builder profile management.
- Users, roles, permissions, and audit logs.
- Projects, phases, towers, floors, units, and inventory.
- Customers, leads, bookings, and buyer profiles.
- Sales pipeline and follow-up management.
- Documents, file assets, approvals, and verification.
- Payment schedules, demand notes, receipts, dues, and refunds.
- Site progress, tasks, issues, checklists, and photo updates.
- Contractors, vendors, and work packages.
- Notifications, reminders, and activity timelines.
- Reports and dashboards.
- System settings and master data.

## Success Criteria

- A builder can configure their organization, team, projects, and inventory without developer intervention.
- Back-office teams can run customer, booking, document, payment, and approval workflows from the web portal.
- Field teams can submit structured mobile updates with evidence and status tracking.
- Permissions prevent accidental cross-role access while keeping day-to-day workflows fast.
- Shared contracts keep API, web, and future mobile behavior aligned.

## Implemented Access And Commercial Foundation

- Subscription belongs to the customer Organization and controls configurable capacity, not employee authority.
- Organization Role is the permission ceiling.
- Project assignment controls where a Member works.
- Project permission grants control what a `CUSTOM` assignment can do within that Project.
- Builder Supervisor represents Builder-side oversight; Site Supervisor represents field execution.
- Operating profiles are workflow presets, not commercial plans or authorization shortcuts.
