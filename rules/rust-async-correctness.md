---
name: rust-async-correctness
description: "Rust/Tokio async correctness — blocking I/O detection, task pool design, spawn_blocking discipline, and runtime-safe patterns"
---

<purpose>Catch async correctness bugs that compile fine but fail at runtime: blocking calls in async contexts, missing task consolidation, redundant I/O in loops, and improper synchronization.</purpose>

<directives>
  <directive severity="critical" name="No Blocking I/O in Async">NEVER use `std::fs::*`, `std::net::*`, or any blocking I/O call inside async functions/blocks. Use `tokio::fs::*` for filesystem operations. If a sync API is unavoidable, wrap in `tokio::task::spawn_blocking` — but prefer native async alternatives first.</directive>
  <directive severity="critical" name="No Repeated I/O in Loops">Reads that produce the same result every iteration MUST be hoisted outside the loop. A blocking read inside an async loop that runs every interval is a double bug: blocking + redundant.</directive>
  <directive severity="high" name="Single Shared Task Pool">There should be ONE global task pool for a given resource type (network, disk). Multiple independent pools with separate concurrency limits fragment the system's backpressure. Share `max_concurrent` across all operations of the same kind.</directive>
  <directive severity="high" name="Download as Separate Task">Long-running operations (file downloads, network fetches) MUST run in their own spawned task. Never block a message receiver/event handler with a download. The handler should enqueue work and return immediately.</directive>
  <directive severity="high" name="Use Native Async APIs">Prefer `tokio::fs::read_dir` over `std::fs::read_dir` wrapped in `spawn_blocking`. The native async version exists for this exact purpose and avoids threadpool overhead.</directive>
  <directive severity="medium" name="Combine Startup + Periodic">If you have both `refresh_on_startup` and a periodic interval, combine into one code path by adjusting `tokio::time::interval_at` start time to `Instant::now()` for immediate first tick. Don't maintain two separate trigger paths.</directive>
  <directive severity="medium" name="Filter Early">Apply filters (already-processed, already-played, max count limits) BEFORE expensive operations (network fetch, disk read), not after. Early filtering avoids wasted work.</directive>
</directives>

<detection-patterns>
  <pattern name="Blocking in Async" severity="critical">
    <signature>std::fs::read_dir, std::fs::read, std::fs::write, std::net::TcpStream inside async fn or async block</signature>
    <fix>Replace with tokio::fs::* or tokio::net::* equivalents</fix>
  </pattern>
  <pattern name="Loop-Invariant I/O" severity="critical">
    <signature>File read or directory scan inside `loop { ... }` or `while ... { ... }` in async context where the result doesn't change between iterations</signature>
    <fix>Hoist the read outside the loop; re-read only on explicit invalidation signal</fix>
  </pattern>
  <pattern name="Receiver Blocked by Download" severity="high">
    <signature>In a `select!` or `recv().await` handler: direct `reqwest::get(...).await` or file write that takes seconds</signature>
    <fix>Spawn a separate task for the download; the handler records intent and returns</fix>
  </pattern>
  <pattern name="Duplicate Task Pools" severity="high">
    <signature>Multiple `Semaphore::new(N)` or `tokio::sync::Semaphore` for the same resource type in different modules</signature>
    <fix>Consolidate into a single shared semaphore passed via DI</fix>
  </pattern>
</detection-patterns>

<checklist>
  <check>No std::fs or std::net calls inside async functions</check>
  <check>No I/O operations inside loops that could be hoisted</check>
  <check>Downloads and long operations spawned as separate tasks</check>
  <check>Single concurrency limiter per resource type</check>
  <check>Startup logic reuses periodic code path (no duplication)</check>
  <check>Filters applied before expensive operations</check>
  <check>tokio::fs used instead of std::fs in async context</check>
</checklist>
