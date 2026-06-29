---
name: config-design
description: Configuration schema design patterns — nesting, condensation, defaults, and human-readable documentation
---

<purpose>Design configuration schemas that are intuitive, minimal, and self-documenting. Reviewers reject verbose configs with redundant fields, unclear defaults, or poor organization.</purpose>

<directives>
  <directive severity="high" name="Nest Under Domain">Config sections MUST live under their parent domain. Podcast-related config goes under `[podcast]`, not a separate top-level `[synchronization]` section. The config tree should mirror the feature tree.</directive>
  <directive severity="high" name="Condense Enable + Interval">When a feature has `enable: bool` + `interval: Duration`, condense into one field. `interval = 0` (or `None`) means disabled. Two fields that are logically dependent should be one field with a sentinel value.</directive>
  <directive severity="high" name="Per-Entity Tracking Over Global">When entities have independent lifecycles (e.g., multiple podcasts), store per-entity state (`last_checked`, `next_check_at`, `check_interval`) rather than one global timer. Global timers miss the granularity that real-world usage demands.</directive>
  <directive severity="medium" name="Human-Readable Default Comments">Every duration/numeric default MUST have a human-readable comment explaining what the value means. `interval = 3600` → `interval = 3600 # 1 hour`. Prefer `humantime` format ("1h", "30m") over raw seconds where the config format supports it.</directive>
  <directive severity="medium" name="Use Enums Over Bools">When a boolean controls mode selection with potential for future modes, use an enum instead. `refresh_on_startup: bool` → `startup_behavior: enum { Refresh, Skip, ... }`. Enums are extensible; bools are not.</directive>
  <directive severity="medium" name="Test String Format">When config serializes to a specific string format (e.g., "5h15m30s"), test the actual string output, not just the computed total. Format fidelity matters for round-tripping.</directive>
  <directive severity="low" name="Abbreviations in Tests">Avoid unexplained abbreviations in test code. `AC` (acceptance criteria), `T` (task) are unclear to reviewers. Use full descriptive names or add a comment explaining the convention.</directive>
</directives>

<anti-patterns>
  <anti-pattern name="Orphan Config Section">A config section that logically belongs under an existing parent but lives at the top level. Creates confusion about what feature owns it.</anti-pattern>
  <anti-pattern name="Redundant Enable Flag">Having both `enabled: true` and `interval: 30m` when `interval: 0` or `interval: null` could express "disabled" without a separate field.</anti-pattern>
  <anti-pattern name="Global Timer for Per-Entity Work">One `check_interval` for all podcasts means you can't refresh breaking-news podcasts every 15m and archival podcasts every 24h.</anti-pattern>
  <anti-pattern name="Magic Number Default">Default value with no comment: `max_retries = 3`. Why 3? Document the reasoning or link to where it was derived.</anti-pattern>
</anti-patterns>

<checklist>
  <check>Config section nested under correct parent domain</check>
  <check>No redundant enable + value field pairs</check>
  <check>Per-entity state for entities with independent lifecycles</check>
  <check>All numeric/duration defaults have human-readable comments</check>
  <check>Enums used instead of bools where extensibility is likely</check>
  <check>String format round-tripping tested</check>
</checklist>
