---
name: pr-review-readiness
description: Pre-submission checklist derived from real reviewer rejection patterns — prevent common causes of CHANGES_REQUESTED
---

<purpose>Prevent PRs from being rejected by catching the patterns that experienced reviewers flag most often. This is the "would a senior maintainer reject this?" pre-check before marking implementation complete.</purpose>

<directives>
  <directive severity="critical" name="Prerequisites Identified">Before building feature X, verify no prerequisite refactoring is needed. "Move existing Y from module A to module B first" is a common blocker. If the feature depends on infrastructure that lives in the wrong place, the prerequisite is the PR — not the feature.</directive>
  <directive severity="critical" name="Design Matches Domain Model">The implementation's data model MUST match the domain's natural structure. If entities have independent lifecycles (per-podcast schedules), the design must reflect that — not paper over it with a global timer. Mismatched models get immediate CHANGES_REQUESTED.</directive>
  <directive severity="high" name="Behavior is Configurable">Any automatic behavior that affects user experience (auto-enqueue, auto-play, auto-sync) MUST be opt-in or have a disable switch. "There is currently no way to turn this off" = rejection.</directive>
  <directive severity="high" name="Ordering Guarantees">When items from multiple sources get combined (episodes from different podcasts), document and enforce the ordering guarantee. "They can appear in any order" is unacceptable for user-facing lists.</directive>
  <directive severity="high" name="Error Isolation">When processing N items and item K fails, the remaining items MUST still be processed. A single network error for one podcast shouldn't prevent other podcasts from syncing. Document the failure-isolation boundary.</directive>
  <directive severity="high" name="Commit Style Matches Project">Check CONTRIBUTING.md and recent commits for the project's commit message conventions BEFORE committing. Scope format, prefix conventions, and capitalization rules vary by project.</directive>
  <directive severity="medium" name="Module Doc Comments">Every new module MUST have a `//!` doc comment explaining its purpose and scope. Use the project's existing module doc style as template.</directive>
  <directive severity="medium" name="Default Impls Over Manual Constructors">When a struct's constructor just sets all fields to default values, implement `Default` trait instead of a manual `new()`. Reviewers flag unnecessary manual constructors.</directive>
  <directive severity="medium" name="Inline Single-Use Bindings">If a variable is assigned and immediately used once, consider inlining it. "This line could be inlined" is common reviewer feedback for unnecessary intermediate bindings.</directive>
</directives>

<pre-submission-questions>
  <question category="design">Does the data model match the domain's natural structure? (per-entity vs global)</question>
  <question category="design">Are there prerequisites that should be separate PRs?</question>
  <question category="design">Is every automatic behavior configurable/disableable?</question>
  <question category="correctness">If one item fails, do remaining items still process?</question>
  <question category="correctness">Are ordering guarantees documented and enforced?</question>
  <question category="correctness">Are types used for their semantic meaning (not just convenience)?</question>
  <question category="quality">Do all new modules have //! doc comments?</question>
  <question category="quality">Are constructors using Default where appropriate?</question>
  <question category="quality">Do commits match CONTRIBUTING.md conventions?</question>
  <question category="tests">Do tests assert observable outcomes (not just construction)?</question>
  <question category="tests">Are test names accurate descriptions of what's verified?</question>
  <question category="tests">Do error tests assert specific error content?</question>
</pre-submission-questions>

<rejection-patterns>
  <pattern name="Missing Prerequisite" frequency="very-common">Reviewer says "Before this feature, X should be moved/refactored first." The feature PR is stalled until the prerequisite is done separately.</pattern>
  <pattern name="Wrong Granularity" frequency="common">Global config/timer for something that needs per-entity granularity. Reviewer says "podcasts themselves should store last_checked."</pattern>
  <pattern name="No Opt-Out" frequency="common">Automatic behavior with no disable switch. Reviewer says "there is no way to turn this off."</pattern>
  <pattern name="Redundant Tests" frequency="common">20+ tests that test nothing new, test basic language features, or duplicate other tests. Reviewer leaves "Wasn't this literally a test above?" on multiple tests.</pattern>
  <pattern name="Blocking in Async" frequency="common">Sync I/O call in async context. Reviewer says "use tokio::fs::read_dir" or "this is a blocking read in async."</pattern>
  <pattern name="Type Semantic Mismatch" frequency="moderate">Using wrong variant/type for convenience (Path instead of PodcastUrl because file exists locally). Reviewer marks WRONG.</pattern>
</rejection-patterns>
