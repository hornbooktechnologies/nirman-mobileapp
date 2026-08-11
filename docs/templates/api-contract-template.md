# API Contract Template

## 1. Endpoint

- Method:
- Path:
- Surface: web / mobile / both / system
- Module:

## 2. Purpose

Describe the business operation and the user-visible result.

## 3. Access Control

- Required permission key in `resource:action` format:
- Organisation membership requirement:
- Project membership requirement:
- Organisation-wide scope behavior:
- Forbidden/not-found behavior for cross-tenant or cross-project access:

API authorization must use resolved membership/project access. Do not rely on inherited global `users.roleId` except as a documented compatibility bridge.

## 4. Request

- Path params:
- Query params:
- Headers:
- Body schema:
- Idempotency requirement:

## 5. Response

Success envelope:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Error envelope:

```json
{
  "success": false,
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

## 6. Validation and Errors

List validation rules, stable error codes, and expected web/mobile UI behavior.

## 7. Data Access Notes

- Repository owner in `apps/api`:
- Tables touched, using plural `snake_case` for new tables:
- Transaction boundary:
- Concurrency/idempotency behavior:

Use `mysql2/promise` only. Do not introduce Prisma, web/mobile database access, package-structure changes, or unapproved SQL migrations from an API contract.

## 8. Audit, Notifications, and Events

List audit actions, notification triggers, event payloads, and sensitive fields to redact.

## 9. Tests

Include permission, tenant isolation, project isolation, validation, transaction, idempotency, and client contract tests.
