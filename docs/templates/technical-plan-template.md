# Technical Plan Template

## 1. Status

- Draft / Approved / Superseded:
- Module or phase:
- Last updated:

## 2. Purpose

Explain what approved contract or phase this plan implements.

## 3. Inputs

List requirement docs, contracts, decisions, source files, and templates read.

## 4. Scope

In scope:

- 

Out of scope:

- 

## 5. Approved Decisions

List decisions that this plan must follow.

## 6. Implementation Slices

| Slice | Goal | Areas | Verification | Approval Needed |
| --- | --- | --- | --- | --- |
| 1 | Shared contracts | `packages/shared` | shared type-check | no |
| 2 | SQL draft | SQL file only | review only | before execution |
| 3 | API | `apps/api` | API type-check/build/tests | no |
| 4 | Web | `apps/web` | web type-check | no |
| 5 | Mobile | `apps/mobile` | mobile type-check/device smoke | no |
| 6 | Review | docs | review report | before next module |

## 7. File Plan

List likely files to create or update.

## 8. Verification Plan

List commands and manual checks.

## 9. Risks

List data, security, contract, runtime, UI, and verification risks.

## 10. Rollback Notes

Explain how to back out safely.

## 11. Open Decisions

List decisions that block or constrain implementation.

## 12. Exit Criteria

Define what must be true before moving to the next module.

