---
name: api-design-heuristics
description: API and protocol design — delegation patterns, constructor hygiene, type semantics, and wire protocol correctness
---

<purpose>Catch API/protocol design mistakes that create maintenance debt: duplicated constructors, leaky abstractions, incorrect type semantics, and wire protocol misuse.</purpose>

<directives>
  <directive severity="critical" name="Semantic Type Correctness">The type used in a message/struct MUST match the domain semantics. A podcast episode MUST always be `PodcastUrl` with its episode URL — even if the file is downloaded locally. The source type identifies WHAT it is, not WHERE it currently lives.</directive>
  <directive severity="high" name="Delegate, Don't Duplicate">New constructors that differ by one parameter from existing constructors MUST delegate to the existing one. `new_append_single` should call `new_single` with the extra parameter, not redefine all fields. Aliases are fine if documented.</directive>
  <directive severity="high" name="Reuse Existing Utilities">Before implementing filesystem operations (create_dir, path resolution), search for existing utilities in the codebase. `lib::utils::create_podcast_dir` already exists — use it.</directive>
  <directive severity="high" name="Reduce Function Arguments">When a function takes 5+ arguments that all come from the same struct/context, pass the struct instead of destructuring into individual parameters. Cluttered argument lists signal missing abstraction.</directive>
  <directive severity="medium" name="Extract Deep Nesting">When nesting exceeds 4 levels (especially in match/if-let chains), extract the inner block into a named function. The name documents the intent; the body becomes testable in isolation.</directive>
  <directive severity="medium" name="Modify In Place vs Reconstruct">When updating an existing struct instance, prefer modifying the fields that change over reconstructing all fields from scratch. `ep.status = Downloaded` instead of `Episode { title: ep.title, url: ep.url, status: Downloaded, ... }`. Less error-prone when fields are added later.</directive>
  <directive severity="medium" name="Result/Option Combinators">Use `Result::and_then`, `Option::and_then`, `map`, `map_err` instead of converting between types manually. Combinator chains are more idiomatic and less error-prone.</directive>
</directives>

<anti-patterns>
  <anti-pattern name="The Type Lie">Using `PlaylistTrackSource::Path(local_path)` for a podcast episode because it happens to be downloaded. The type says "local file" but the domain says "podcast episode". Future code matching on source type will misclassify it.</anti-pattern>
  <anti-pattern name="The Clone Constructor">New function that copies 90% of an existing constructor with one difference. Creates two places to update when fields change.</anti-pattern>
  <anti-pattern name="The Argument Explosion">fn do_thing(config: &Config, db: &Db, tx: &Sender, rx: &Receiver, flag: bool, count: usize, name: &str) — pass a context struct instead.</anti-pattern>
  <anti-pattern name="The Reimplementation">Writing `std::fs::create_dir_all(podcast_dir)` when `lib::utils::create_podcast_dir` already handles path resolution, error messages, and platform differences.</anti-pattern>
</anti-patterns>

<checklist>
  <check>Types match domain semantics, not physical location</check>
  <check>New constructors delegate to existing ones when possible</check>
  <check>Existing utility functions reused (searched lib/utils first)</check>
  <check>Functions have ≤4 parameters (or use context struct)</check>
  <check>Nesting depth ≤4 levels</check>
  <check>Struct updates modify in place, not reconstruct</check>
  <check>Result/Option chains use combinators</check>
</checklist>
