# Worker deactivation preserves assignments

Status: approved by the owner in chat on 2026-10-29.

The owner selected: “Keep the existing API behavior: retain assignments and exclude inactive workers from active rosters”.

Deactivation marks the Worker inactive, preserves existing assignment and primary-project rows, and retains Attendance and financial history. Inactive Workers are excluded from default active rosters and cannot receive new assignments. Ending an assignment remains a separate explicit operation. Permanent deletion remains a separate organization-authorized action with the existing irreversible warning and transaction rules.

Web and Mobile use the same existing endpoints and permissions. This decision resolves the earlier soft-deactivation ambiguity; it does not authorize a database rollout or execute any lifecycle operation. Authenticated/device acceptance remains separate.
