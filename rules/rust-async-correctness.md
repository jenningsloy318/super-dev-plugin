---
name: rust-async-correctness
description: "Rust/Tokio async correctness — blocking I/O, task pools, CancellationToken hierarchy, adaptive polling, periodic tasks, channel selection, recovery patterns"
---

<purpose>Catch async correctness bugs that compile fine but fail at runtime: blocking calls in async contexts, missing task consolidation, redundant I/O in loops, improper synchronization, shutdown races, and backpressure failures. Includes production-proven patterns from 40+ spec RDP server (wooRDP), media cache proxy (woo-tv), and multi-crate service (termusic).</purpose>

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
  <check>CancellationToken hierarchy matches resource ownership (server → session → task)</check>
  <check>Periodic tasks use interval_at + select!(cancel) pattern</check>
  <check>Bounded concurrency uses TaskPool pattern (Semaphore + CancellationToken + spawn)</check>
  <check>Channel types match data semantics (watch=newest-wins, mpsc=ordered)</check>
  <check>Graceful shutdown has grace period before force-abort</check>
  <check>Error in periodic task logs and continues, doesn't abort the loop</check>
</checklist>

<advanced-patterns>
  <pattern name="CancellationToken Hierarchy" severity="critical">
    <description>Shutdown propagates top-down: server_token → per-session child_token → per-task clone. Cancelling parent cancels all children. Never create orphan tokens (they leak tasks).</description>
    <example>
    let server_token = CancellationToken::new();
    // Per-connection:
    let session_token = server_token.child_token();
    // Per-task within session:
    let task_token = session_token.clone();
    tokio::spawn(async move {
        tokio::select! {
            result = do_work() => handle(result),
            _ = task_token.cancelled() => { /* cleanup */ }
        }
    });
    // On SIGTERM: server_token.cancel() → all sessions → all tasks
    </example>
  </pattern>
  <pattern name="Bounded Task Pool (Minimal)" severity="high">
    <description>30-line bounded executor: Semaphore limits concurrency, CancellationToken enables bulk cancel, Drop closes semaphore + cancels all. Use for fan-out work (feed fetching, downloads, API calls).</description>
    <example>
    pub struct TaskPool {
        semaphore: Arc&lt;Semaphore&gt;,
        cancel_token: CancellationToken,
    }
    impl TaskPool {
        pub fn new(n: usize) -> Self { /* ... */ }
        pub fn execute&lt;F: Future + Send + 'static&gt;(&amp;self, func: F) {
            let sem = self.semaphore.clone();
            let token = self.cancel_token.clone();
            tokio::spawn(async move {
                tokio::select! {
                    _ = async { let _p = sem.acquire().await; func.await; } => {},
                    _ = token.cancelled() => {}
                }
            });
        }
    }
    impl Drop for TaskPool {
        fn drop(&amp;mut self) { self.semaphore.close(); self.cancel_token.cancel(); }
    }
    </example>
  </pattern>
  <pattern name="Periodic Task (Canonical Shape)" severity="high">
    <description>The ONE correct pattern for periodic background work in tokio. interval_at prevents immediate first tick. select! with cancel ensures clean shutdown. Errors logged, not propagated.</description>
    <example>
    fn start_periodic(handle: Handle, cancel: CancellationToken, interval: Duration) {
        handle.spawn(async move {
            let mut timer = tokio::time::interval_at(Instant::now() + interval, interval);
            loop {
                tokio::select! {
                    _ = timer.tick() => {
                        if let Err(e) = do_work().await {
                            warn!("periodic task error: {e:#}"); // Log, don't abort
                        }
                    }
                    _ = cancel.cancelled() => break,
                }
            }
        });
    }
    // Variation: refresh_on_startup = set start to Instant::now()
    </example>
  </pattern>
  <pattern name="Channel Selection by Semantics" severity="medium">
    <description>Choose channel type based on data semantics, not convenience:</description>
    <example>
    // watch: newest-wins (frames, state snapshots) — reader always sees latest
    let (frame_tx, frame_rx) = tokio::sync::watch::channel(initial_frame);
    
    // mpsc bounded: ordered queue (commands, events) — backpressure on full
    let (cmd_tx, cmd_rx) = tokio::sync::mpsc::channel::&lt;PlayerCmd&gt;(256);
    
    // broadcast: fan-out (events to multiple clients) — each receiver gets all
    let (event_tx, _) = tokio::sync::broadcast::channel::&lt;Event&gt;(10);
    
    // oneshot: single response (shutdown handshake, query result)
    let (done_tx, done_rx) = tokio::sync::oneshot::channel();
    </example>
  </pattern>
  <pattern name="Adaptive Poll Timeout" severity="medium">
    <description>Event loops that alternate between burst and idle should scale their poll timeout via a state machine. Saves CPU when idle, provides sub-ms response when active.</description>
    <example>
    enum PollState { Active, Normal, Idle }
    fn timeout(state: PollState) -> Duration {
        match state {
            PollState::Active => Duration::from_millis(1),   // Frame in-flight
            PollState::Normal => Duration::from_millis(16),  // 60fps budget
            PollState::Idle   => Duration::from_millis(100), // Nothing happening
        }
    }
    // Transition: Active→Normal on frame-complete
    //             Normal→Idle after 500ms inactivity
    //             Any→Active on new event/frame
    </example>
  </pattern>
  <pattern name="Graceful Shutdown with Grace Period" severity="medium">
    <description>Shutdown sequence: (1) cancel token, (2) grace period for in-flight work, (3) force-abort remaining tasks.</description>
    <example>
    async fn shutdown(token: CancellationToken, tasks: JoinSet&lt;()&gt;) {
        token.cancel();
        // Grace period: wait up to 5s for tasks to finish
        let grace = tokio::time::timeout(Duration::from_secs(5), async {
            tasks.join_all().await;
        });
        if grace.await.is_err() {
            warn!("shutdown grace period exceeded, aborting remaining tasks");
            tasks.abort_all();
        }
    }
    </example>
  </pattern>
  <pattern name="DegradationFlags (Independent Recovery Axes)" severity="medium">
    <description>Model system degradation as independent boolean flags, not a single enum. Allows combinations (e.g., software encode + reduced FPS simultaneously) and independent recovery per axis.</description>
    <example>
    #[derive(Default, Clone, Copy)]
    pub struct DegradationFlags {
        pub software_fallback: bool,  // Hardware → software
        pub reduced_quality: bool,    // Full → reduced
        pub reduced_rate: bool,       // Normal → throttled
        pub paused: bool,             // Running → paused
    }
    impl DegradationFlags {
        pub fn is_degraded(&amp;self) -> bool {
            self.software_fallback || self.reduced_quality || self.reduced_rate || self.paused
        }
    }
    </example>
  </pattern>
</advanced-patterns>
