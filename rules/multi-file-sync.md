---
name: multi-file-sync
description: "Multi-file synchronization points — detecting coupled files that must be updated atomically to prevent runtime failures"
---

<purpose>Detect and enforce atomic multi-file updates for coupled systems (RBAC permissions, i18n keys, API schema + client types, DB migration + model). Missing ONE file in a sync-point causes hard-to-diagnose runtime failures (403s, missing translations, type mismatches, migration drift). Derived from production enterprise dashboard requiring 4-file permission sync.</purpose>

<directives>
  <directive severity="critical" name="Identify Sync Points During Assessment">When analyzing a codebase, actively look for sync-point patterns: files that MUST be updated together. Common sync-points: (1) RBAC: permission constants + role assignments + middleware checks + frontend guards, (2) i18n: translation keys across locale files, (3) API: schema definition + client types + server handler + documentation, (4) DB: migration file + ORM model + seed data + type definitions.</directive>
  <directive severity="critical" name="All Sync-Point Files in Same Task">When decomposing work into tasks, coupled files MUST appear in the SAME task — never split across phases or tasks. A permission that exists in auth-service constants but not in Go middleware is worse than no permission at all (false sense of security).</directive>
  <directive severity="high" name="Sync-Point Checklist in Spec">The specification/task-list MUST include a "Sync Points" section listing every coupled file group that the implementation touches. Format: `SYNC: [file1, file2, file3] — reason for coupling`. Reviewers verify all files in each group were modified.</directive>
  <directive severity="high" name="Test for Sync Failures">Write at least one integration test that would FAIL if a sync-point file is missing. Example: test that hitting the new endpoint returns 200 (not 403) — this proves permissions are wired in all layers.</directive>
  <directive severity="medium" name="Document Sync Points">New sync-point patterns discovered during implementation MUST be documented in the project's CLAUDE.md or architecture docs. Future developers need to know "when adding X, you MUST also update Y and Z."</directive>
  <directive severity="medium" name="Post-Change Verification">After implementing a sync-point change, verify all coupled files by listing them and checking each was modified. The verification can be a simple grep or a dedicated sync-check script.</directive>
</directives>

<common-sync-points>
  <sync-point name="RBAC Permission" files="4" example="MaCo dashboard">
    <file>auth-service/constants/permissions.ts — Define permission constant (authoritative source)</file>
    <file>auth-service/constants/roles.ts — Assign to roles</file>
    <file>backend-service/auth/permissions.go — Go constant for middleware</file>
    <file>frontend/lib/permissions.ts — Frontend UI guard</file>
    <failure>Missing any file → 403 Forbidden or UI element always hidden</failure>
  </sync-point>
  <sync-point name="API Contract" files="3-4">
    <file>OpenAPI/schema definition (or Go struct tags)</file>
    <file>Client TypeScript types (generated or manual)</file>
    <file>Server handler implementation</file>
    <file>API documentation / README</file>
    <failure>Type mismatch → runtime serialization errors, silent data loss</failure>
  </sync-point>
  <sync-point name="Database Migration" files="2-3">
    <file>Migration SQL file (up + down)</file>
    <file>ORM model definition (struct/class)</file>
    <file>Seed/fixture data (if applicable)</file>
    <failure>Model references column that doesn't exist → runtime panic on first query</failure>
  </sync-point>
  <sync-point name="i18n Translation Keys" files="N locale files">
    <file>en.json, de.json, zh.json, ... (all locale files)</file>
    <file>Component using the key</file>
    <failure>Missing key → shows raw key string "common.button.save" to user</failure>
  </sync-point>
  <sync-point name="Event/Message Schema" files="2-3">
    <file>Event producer (defines shape)</file>
    <file>Event consumer (expects shape)</file>
    <file>Schema registry / shared types</file>
    <failure>Schema mismatch → silent message drops or deserialization crashes</failure>
  </sync-point>
  <sync-point name="Router Wiring" files="2">
    <file>Handler implementation (the function)</file>
    <file>Router registration (the route path + middleware)</file>
    <failure>Handler exists but isn't wired → endpoint returns 404</failure>
  </sync-point>
</common-sync-points>

<checklist>
  <check>All sync-point file groups identified in task decomposition</check>
  <check>Coupled files assigned to the same task (never split)</check>
  <check>Spec includes "Sync Points" section listing all coupled groups</check>
  <check>Integration test verifies the sync (would fail if any file missing)</check>
  <check>Post-implementation: verify all files in each group were modified</check>
  <check>New sync-point patterns documented for future reference</check>
</checklist>
