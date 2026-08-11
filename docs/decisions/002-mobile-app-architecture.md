# 002. Mobile App Architecture

## Status

Approved

## Date

2026-07-18

## Context

NirmanSite needs a future mobile app for field and fast-response workflows. The first mobile task is only a foundation scaffold, not a business-module implementation.

The repository already contains a NestJS API, Next.js web portal, inherited database package, and shared TypeScript package. Database architecture is now superseded by `004-database-access-mysql2.md`.

## Decision

Create `apps/mobile` as an Expo application using React Native, TypeScript, and Expo Router.

Use an Expo Router `app/` directory with route groups:

- `app/(auth)` for unauthenticated routes.
- `app/(app)` for protected routes.

Use mobile-specific native components and do not reuse web React components.

## Initial Foundation

The initial foundation includes:

- Expo config.
- TypeScript config.
- Expo Router entry point.
- Login placeholder screen.
- Protected dashboard placeholder screen.
- Session/loading placeholder.
- Mobile config, providers, API helper, auth helper, secure storage helper, auth feature folder, UI components, and common components.

## Boundaries

- No database schema or SQL migration changes.
- No NirmanSite business modules.
- No offline-first sync.
- No backend implementation.
- No web component reuse.

## Consequences

- Mobile can now be type-checked and iterated as a workspace app.
- API authentication integration remains a future task.
- Field modules such as site progress, tasks, issues, checklists, and photo uploads remain future tasks.
