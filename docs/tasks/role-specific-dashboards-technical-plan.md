# Role-Specific Dashboards Technical Plan

1. Add shared dashboard/profile/action response contracts and `dashboards:read`.
2. Extend Project Access with a permission-neutral context resolver, preserving existing required-permission behavior.
3. Add an aggregated NestJS dashboard module with tenant/Project isolation and permission-filtered concurrent queries.
4. Add read-path indexes in migration 023 and sync the customer role templates through the guarded seed.
5. Replace the Mobile dashboard request fan-out with the aggregate endpoint.
6. Add a token-driven layered dashboard background, role command hero, role metrics, and role actions while preserving existing section hierarchy.
7. Add en/hi/gu parity and verify static, database, runtime, and device gates independently.
