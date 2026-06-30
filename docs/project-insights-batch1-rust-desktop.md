# Deep Insights Distillation from Personal Projects

> Generated 2026-06-30 from deep analysis of 12 projects.  
> Purpose: Identify high-value patterns to enrich the super-dev plugin.

---

## Projects Analyzed

| Project | Language | Domain | Specs | Key Insight Domain |
|---------|----------|--------|-------|-------------------|
| **wooRDP** | Rust (Ed. 2024) | RDP server | 40 | Async architecture, recovery, security |
| **woo-tv** | Rust | GPUI media player | 70+ | Cache proxy, GPUI state, platform abstraction |
| **woo-launcher** | Rust | GPUI app launcher | 38 | Latency optimization, IPC, window lifecycle |
| **woo-dock** | C++20/Qt6 | Wayland dock | 29 | Multi-compositor, animations, task matching |
| **live-Cap** | Rust | Audio transcription | 173 | Cross-platform audio, GPUI patterns |
| **termusic** | Rust (Ed. 2024) | TUI music player | contrib | Server-client separation, gRPC, TaskPool |
| **Feeder** | Kotlin/Android | RSS reader + AI | 39 | LLM integration, parallel translation, caching |
| **rehype-infographic** | TypeScript | Rehype plugin | — | AST manipulation |
| **astro-marp** | TypeScript | Astro integration | — | Build pipeline |
| ttplayer/ttplayer2 | Design | Music player UI | — | Pencil MCP design |
| pieplayer | Go (research) | Audio player | — | Library research |

---

## Tier 1: Production-Critical Patterns (Hard-won, multi-iteration)

### 1. Generation Counter + CancellationToken for Session Lifecycle
**Source**: woo-tv (`CacheManager`), wooRDP (`SessionBuilder`)

```rust
// Pattern: Increment generation BEFORE stop to make in-flight stale immediately
pub fn start_session(&mut self, url: &str) -> Option<String> {
    // Generation incremented first — all in-flight tasks check this
    self.session_generation.fetch_add(1, Ordering::Release);
    // Then stop old session
    if let Some(session) = self.session.take() {
        session.cancel.cancel();
    }
    // Start new session with new cancel token
    let cancel = CancellationToken::new();
    // ... spawn tasks with cancel.clone() + generation snapshot ...
}
```

**Why this ordering matters**: If you cancel first, there's a window where an in-flight task could finish and write stale data *after* cancel but *before* new session starts. Generation-first makes any in-flight writes no-ops because `generation != current_generation`.

**Lesson**: For any stateful system with overlapping sessions (player sessions, RDP connections, cache sessions), always: (1) increment generation, (2) cancel old, (3) start new.

---

### 2. Lock-Free Fast Path + Mutex Slow Path (Dual Access)
**Source**: woo-tv (`cache_health_atomic` + `report` Mutex)

```rust
// Fast path: ~1ns, lock-free, for latency-sensitive event loops
pub fn cache_health_atomic(&self) -> CacheHealth {
    match self.cache_health_atomic.load(Ordering::Acquire) {
        CACHE_HEALTH_HEALTHY => CacheHealth::Healthy,
        _ => CacheHealth::Filling,
    }
}

// Slow path: ~50ns, mutex, for detailed reporting
pub fn report(&self) -> CacheReport {
    self.report.lock().clone()
}

// Writer (fetcher task) updates BOTH atomically:
report.lock().health = new_health;
cache_health_atomic.store(new_health.to_atomic_encoding(), Ordering::Release);
```

**Why**: The mpv event loop runs at 60Hz. Taking a mutex on every iteration adds jitter. The atomic fast-path eliminates lock contention on the hot path while the mutex provides the detailed data on-demand.

**Lesson**: When one consumer is latency-sensitive and reads frequently but only needs a summary, expose both a lock-free atomic encoding AND a mutex-guarded detailed struct. Writers update both.

---

### 3. Pre-Created Hidden Window (Show/Hide vs Create/Destroy)
**Source**: woo-launcher (spec-38), measured 15-40ms → ~0.1ms improvement

```rust
// At startup: create window off-screen at (-32768, -32768)
pub fn precreate_window_options() -> WindowOptions {
    WindowOptions {
        bounds: WindowBounds::Windowed(Bounds {
            origin: point(px(-32768.), px(-32768.)),
            size: size(px(800.), px(600.)),
        }),
        titlebar: Some(TitlebarOptions { appears_transparent: true, .. }),
        kind: WindowKind::PopUp,  // Skip taskbar
        ..Default::default()
    }
}

// Show = reposition to center + activate (0.1ms)
// Dismiss = reposition off-screen (0.1ms)  
// vs old: open_window (15-40ms) / remove_window (varies)
```

**Why**: Wayland window creation involves compositor round-trips (surface create → configure → ack → commit → first frame). Pre-creation amortizes this cost to startup.

**Lesson**: For frequently-shown transient UI (launchers, command palettes, notifications), pre-create hidden and show/hide. The 100x speedup is real.

---

### 4. Named FIFO for Fire-and-Forget IPC (~10µs vs 100µs UDS)
**Source**: woo-launcher (spec-38)

```rust
// Sender (shim binary): ~10µs total
pub fn send_show_signal() -> io::Result<()> {
    let path = daemon_fifo_path();
    let mut f = std::fs::OpenOptions::new().write(true).open(&path)?;
    f.write_all(&[SIGNAL_SHOW])?;
    Ok(())
}

// Receiver (daemon): async read loop with RAII cleanup
pub async fn run_fifo_listener(bridge_tx: UnboundedSender<BridgeMsg>) {
    let path = daemon_fifo_path();
    ensure_fifo(&path)?;
    let _cleanup = FifoCleanup(path.clone()); // Unlinks on drop
    loop {
        match read_one_signal(&path).await {
            Ok(SIGNAL_SHOW) => { let _ = bridge_tx.send(BridgeMsg::Show); }
            Err(e) => { /* recreate FIFO on error */ }
        }
    }
}
```

**Why**: UDS requires connect + send + response cycle (~100µs). FIFO is open + write + close (~10µs). For fire-and-forget signals where no response is needed, FIFO is 10x faster.

**Lesson**: Use Named FIFO for unidirectional signals (show, hide, reindex). Keep UDS for request-response (query, status).

---

### 5. TaskPool: Semaphore + CancellationToken (Minimal Bounded Executor)
**Source**: termusic (`lib/src/taskpool.rs`)

```rust
pub struct TaskPool {
    semaphore: Arc<Semaphore>,
    cancel_token: CancellationToken,
}

impl TaskPool {
    pub fn execute<F, T>(&self, func: F)
    where F: Future<Output = T> + Send + 'static, T: Send {
        let semaphore = self.semaphore.clone();
        let token = self.cancel_token.clone();
        tokio::spawn(async move {
            let main = async {
                let Ok(_permit) = semaphore.acquire().await else { return; };
                func.await;
            };
            tokio::select! {
                () = main => {},
                () = token.cancelled() => {}
            }
        });
    }
}

impl Drop for TaskPool {
    fn drop(&mut self) {
        self.semaphore.close();   // Prevent new tasks
        self.cancel_token.cancel(); // Cancel running tasks
    }
}
```

**Why**: This is the minimum viable bounded async executor. 30 lines. Drop-safe (RAII cancellation). Used for podcast feed fetching (n=3), download concurrency, any bounded fan-out.

**Lesson**: Don't reach for a heavyweight task framework. `Semaphore + CancellationToken + tokio::spawn + select!` is the universal building block.

---

### 6. Packed AtomicU64 CAS Token Bucket (Lock-Free Rate Limiting)
**Source**: wooRDP (`woo-rdp-security/src/rate_limiter.rs`)

```rust
// Pack tokens (high 32) + last_refill_ms (low 32) into one AtomicU64
fn pack(tokens: u32, last_ms: u32) -> u64 {
    (u64::from(tokens) << 32) | u64::from(last_ms)
}

fn try_acquire(&self, base: Instant) -> bool {
    let now_ms = (instant_to_ms(base, Instant::now()) & 0xFFFF_FFFF) as u32;
    loop {
        let current = self.state.load(Ordering::Acquire);
        let tokens = unpack_tokens(current);
        let last_ms = unpack_last_ms(current);
        
        let elapsed = now_ms.wrapping_sub(last_ms);
        if elapsed >= self.window_ms {
            // Refill + consume atomically
            let new_state = pack(self.rate.saturating_sub(1), now_ms);
            match self.state.compare_exchange_weak(current, new_state, AcqRel, Acquire) {
                Ok(_) => return true,
                Err(_) => continue, // CAS retry
            }
        } else if tokens == 0 {
            return false; // Rate limited
        } else {
            // Consume one token
            let new_state = pack(tokens - 1, last_ms);
            match self.state.compare_exchange_weak(current, new_state, AcqRel, Acquire) {
                Ok(_) => return true,
                Err(_) => continue,
            }
        }
    }
}
```

**Why**: A per-IP rate limiter needs to handle thousands of concurrent checks with zero lock contention. Packing both values into one atomic eliminates ABA problems and split-state races.

**Lesson**: When you need a counter + timestamp pair that's updated atomically, pack into a single wider atomic. CAS loop handles contention.

---

### 7. SecurityGate Cascade (Layered Deny with RAII Permit)
**Source**: wooRDP (`woo-rdp-security/src/gate.rs`)

```rust
pub fn check_connection(&self, ip: IpAddr) -> Result<ConnectionPermit, SecurityError> {
    // Layer 1: IP allowlist/denylist (O(1) hash lookup)
    self.ip_filter.check(ip)?;
    // Layer 2: Per-IP rate limit (lock-free token bucket)
    self.rate_limiter.check(ip)?;
    // Layer 3: Global connection count (atomic counter with RAII permit)
    let permit = self.connection_tracker.try_acquire(ip)?;
    // All passed — emit audit event and return RAII permit
    audit::emit_connection_accepted(ip);
    Ok(permit) // Dropping permit decrements connection count
}
```

**Why**: Each layer is independent, cheapest-first ordered, and logs its own deny reason. The RAII `ConnectionPermit` ensures the connection tracker is always decremented, even on panic.

**Lesson**: For security checks, chain independent validators cheapest→expensive. Return an RAII guard that auto-cleans on drop.

---

### 8. DegradationFlags with Independent Axes
**Source**: wooRDP (`woo-rdp-session/src/recovery/state.rs`)

```rust
#[derive(Debug, Clone, Copy, Default)]
pub struct DegradationFlags {
    pub software_encode: bool,  // Axis 1: GPU → CPU fallback
    pub shm_capture: bool,      // Axis 2: DMA-BUF → SHM fallback
    pub reduced_fps: bool,      // Axis 3: 60fps → 30fps
    pub capture_paused: bool,   // Axis 4: Stop capture entirely
}

impl DegradationFlags {
    pub fn level(&self) -> DegradationLevel {
        // Priority: Paused > ReducedFps > ShmCapture > SoftwareEncode > Full
        if self.capture_paused { return DegradationLevel::Paused; }
        if self.reduced_fps { return DegradationLevel::ReducedFps; }
        // ...
    }
}
```

**Why**: Independent axes mean the system can degrade software encoding while keeping DMA-BUF capture, or reduce FPS while keeping hardware encode. Each recovery path handles one axis. Multiple simultaneous failures degrade along multiple axes.

**Lesson**: Model degradation as independent boolean flags, not a single enum. This allows combinations and independent recovery.

---

### 9. Parallel Translation with Semaphore + channelFlow
**Source**: Feeder (Kotlin, `ParagraphTranslationCoordinator.kt`)

```kotlin
fun translateParagraphs(paragraphs: List<TranslatableText>, target: TranslationLanguage): 
    Flow<ParagraphTranslationProgress> = channelFlow {
    val semaphore = Semaphore(paragraphConcurrency) // 3 concurrent
    coroutineScope {
        paragraphs.forEachIndexed { index, paragraph ->
            launch(Dispatchers.IO) {
                semaphore.withPermit {
                    val result = translateWithRetry(paragraph, target, index)
                    send(result) // Immediate progress to UI
                }
            }
        }
    }
}
```

**Why**: LLM API calls are I/O-bound and expensive. Parallel execution with bounded concurrency gives 3x throughput while each completed paragraph streams to UI immediately (no waiting for all to finish).

**Lesson**: For N independent LLM calls, use `Semaphore(K) + parallel launch + channel` for bounded concurrency with streaming progress. K=3 is the sweet spot for most APIs.

---

### 10. Robust LLM Response Parsing (Defense-in-Depth)
**Source**: Feeder (`SummaryResponseParser.kt`)

```
Strategy chain:
1. Try ```json markdown code block extraction
2. Try generic ``` code block extraction  
3. Try brace-matching JSON object extraction from arbitrary text
4. Fall back to legacy "Lang: XX" format parser
5. UI-layer guard: containsRawJson() prevents rendering unparsed JSON

Brace-matching algorithm:
- Find first '{' in text
- Track nesting depth (inc on '{', dec on '}', handle quotes/escapes)
- Return substring from first '{' to matching '}' at depth 0
- Handles: preamble text, truncated JSON, double-encoded, markdown wrapping
```

**Why**: LLMs don't reliably produce clean JSON. They add conversational preamble, wrap in markdown, truncate mid-object, or produce legacy formats. A single JSON.parse fails 15-20% of the time in production.

**Lesson**: When parsing LLM output, implement a 4+ tier extraction chain. Never rely on a single parse attempt. Have a UI-layer guard as the final safety net.

---

### 11. Inline Tag Preservation Through Translation
**Source**: Feeder (`InlineTagParser.kt`, `TranslationPromptBuilder.kt`)

```
Problem: Rich text (bold, links, code) must survive LLM translation.

Solution:
1. Extract: Convert rich text → plain text with XML-like tags:
   "Click <link href="url">here</link> for <b>details</b>"
2. Translate: Send tagged text to LLM with instruction to preserve tags
3. Parse: Single-pass state machine converts tags back to AnnotatedString

10 tag types: b, i, code, link, s, u, sup, sub, mono, font
Parser: Never throws. Falls back to plain text on malformed input.
138 unit tests cover edge cases.
```

**Why**: Without tag preservation, all formatting is lost on translation. The XML-tag approach works because LLMs understand XML well and can preserve structure while translating content.

**Lesson**: For LLM-mediated rich text transformation, use XML-like tags as the intermediate format. Build a non-throwing single-pass parser for reconstruction.

---

## Tier 2: Architecture Patterns (Proven at Scale)

### 12. Server-Client Separation via gRPC + OS Thread for Playback
**Source**: termusic

```
Architecture:
┌──────────────┐  gRPC   ┌──────────────────────────────────────┐
│   TUI (tui/) │ ←─────→ │  Server (server/)                    │
└──────────────┘          │  ├── actual_main() [tokio runtime]   │
                          │  ├── player_loop() [OS thread, sync] │
                          │  ├── music_player_service [gRPC]     │
                          │  ├── podcast_sync [periodic task]    │
                          │  └── playlist_save [periodic task]   │
                          └──────────────────────────────────────┘
```

**Key insight**: The player loop runs on a dedicated OS thread (not tokio) because audio backends require deterministic timing. The tokio runtime handles I/O (network, gRPC, downloads). Cross-communication via `mpsc::unbounded_channel<PlayerCmd>`.

**Lesson**: For real-time audio/video processing, isolate the real-time loop on its own OS thread. Use channels for async↔sync communication.

---

### 13. Worker Thread + Bridge Channel (GPUI + Tokio Coexistence)
**Source**: woo-launcher, woo-tv, live-Cap (all GPUI apps)

```
┌────────────────────────────┐     mpsc      ┌─────────────────────┐
│ Main Thread (GPUI)         │ ←──BridgeMsg── │ Worker Thread       │
│ - Render loop              │                │ - Tokio runtime     │
│ - cx.spawn() drain loop    │                │ - IPC server        │
│ - Global state updates     │                │ - FS watcher        │
│ - Window show/hide         │ ──quit_done──→ │ - Shutdown sequence │
└────────────────────────────┘    oneshot     └─────────────────────┘
```

**Why**: GPUI owns the main thread and blocks in `Application::run()`. All async work must live elsewhere. The bridge channel is the only safe communication path.

**Lesson**: For GPUI apps, the architecture is always: main thread (GPUI render) + worker thread (tokio). Bridge via unbounded mpsc. Shutdown via oneshot handshake.

---

### 14. Adaptive Poll Timeout (Active/Normal/Idle)
**Source**: wooRDP (session event loop)

```rust
enum PollState { Active, Normal, Idle }

fn poll_timeout(state: PollState) -> Duration {
    match state {
        PollState::Active => Duration::from_millis(1),   // Frame in-flight
        PollState::Normal => Duration::from_millis(16),  // ~60fps budget
        PollState::Idle   => Duration::from_millis(100), // No activity
    }
}
```

**Why**: Fixed poll timeouts waste CPU (too short when idle) or add latency (too long when active). Adaptive timeout gives sub-ms response during active frames while sleeping 100ms when idle.

**Lesson**: For event loops that alternate between burst activity and quiescence, use a state machine to scale poll timeout. Transition: Active→Normal on frame-complete, Normal→Idle on N-ms inactivity, Idle→Active on new frame.

---

### 15. Periodic Task Pattern (interval_at + select! + cancel)
**Source**: termusic, wooRDP (universal pattern across all projects)

```rust
fn start_periodic_task(handle: Handle, cancel: CancellationToken, interval: Duration) {
    handle.spawn(async move {
        let mut timer = tokio::time::interval_at(
            Instant::now() + interval,  // First tick delayed
            interval,
        );
        loop {
            tokio::select! {
                _ = timer.tick() => {
                    if let Err(e) = do_work().await {
                        warn!("periodic task error: {e:#}");
                        // Log, don't abort — next tick will retry
                    }
                }
                _ = cancel.cancelled() => break,
            }
        }
    });
}
```

**Why**: This is the one correct shape for periodic background work in tokio. `interval_at` (not `interval`) prevents immediate first-tick. `select!` with cancel ensures clean shutdown. Error → warn, not abort.

**Lesson**: Every periodic task should follow this exact shape. Variations: `refresh_on_startup` = set start to `Instant::now()`.

---

### 16. Platform cfg-Gated Module Dispatchers
**Source**: woo-tv, live-Cap (3 crates each use this pattern)

```rust
// crates/player/src/platform/mod.rs
#[cfg(target_os = "linux")] mod linux;
#[cfg(target_os = "linux")] pub use linux::{default_mpv_vo, default_mpv_hwdec, default_mpv_ao};

#[cfg(target_os = "macos")] mod macos;
#[cfg(target_os = "macos")] pub use macos::{default_mpv_vo, default_mpv_hwdec, default_mpv_ao};

#[cfg(target_os = "windows")] mod windows;
#[cfg(target_os = "windows")] pub use windows::{default_mpv_vo, default_mpv_hwdec, default_mpv_ao};
```

**Why**: Zero runtime cost (compile-time selection). Each platform module exports identical signatures. Callers use `platform::function_name()` — platform-agnostic at the call site.

**Lesson**: For cross-platform desktop apps, use cfg-gated module dispatchers in: config (paths), app (window options), player (hardware), audio (backends).

---

## Tier 3: Workflow & Process Insights

### 17. Upstream-First Research (spec-29 postmortem)
**Source**: woo-dock

Before writing a new spec for a known problem:
1. Search the upstream/sister project's commit log (5 min)
2. Check if the framework already solves it (Qt's icon engine, tokio's utilities)
3. Only write custom code if upstream doesn't cover it

**Postmortem**: spec-29 spent 3 iterations implementing `findContentBounds + normalizeToSquare` before discovering crystal-dock already solved it with a 5-line pattern. The custom pipeline failed at fractional scales.

### 18. Visual Verification BEFORE Code Review
**Source**: woo-dock (spec-29)

Stage 10 (code review) approved spec-compliant code that was visually broken on the target compositor. The pivot only happened because the user manually tested.

**Fix**: For any change touching rendering/UI, the dev agent MUST run a render harness or screenshot BEFORE code review. Tier 1: pixel-property assertions. Tier 2: headless compositor + grim.

### 19. Stage 10 Gate Loop Bug
**Source**: termusic session (discovered in super-dev workflow)

When adversarial reviewer returns CONTEST with real findings, the gate failure handler loops back to re-run reviewers instead of routing to the implementation fix path. After 3 iterations it escalates, wasting ~100 agent calls.

**Fix**: Distinguish format errors (re-run reviewer) from real findings (route to fix path). Check `verdict !== 'PASS' && findings.length > 0`.

### 20. Translation Cache: Gzip JSON Blob with Orphan Cleanup
**Source**: Feeder (spec-036)

```
Storage: filesDir/translations/{itemId}_{langCode}.translation.json.gz
- Cache-first: check before starting translation
- forceRefresh: bypass cache on explicit re-translate
- Orphan cleanup: in RSS sync deletion loop + scheduled job
- Forward-compatible: Json { ignoreUnknownKeys = true }
```

**Lesson**: For expensive LLM-generated content, cache aggressively with:
1. Deterministic key (entity_id + parameters)
2. Gzip (70-80% size reduction for text)
3. Forward-compatible deserialization
4. Orphan cleanup in the sync/delete path

---

## What This Means for super-dev Plugin

### New Rules to Create:
1. **`rules/rust-gpui-patterns.md`** ✅ (already written — GPUI state, platform, events)
2. **`rules/rust-performance-desktop.md`** — Patterns 1-4 (generation counter, lock-free, pre-created window, FIFO)
3. **`rules/rust-async-correctness.md` enhancement** — Patterns 5, 14, 15 (TaskPool, adaptive poll, periodic task)
4. **`rules/rust-security-hardening.md`** — Patterns 6-8 (token bucket, SecurityGate, degradation flags)
5. **`rules/llm-integration-patterns.md`** — Patterns 9-11 (parallel LLM, robust parsing, tag preservation)

### Agent Enhancements:
- **rust-developer**: Add GPUI workspace layout awareness, IPC patterns, cache proxy patterns
- **research-agent**: Enforce upstream-first research before spec writing
- **code-reviewer**: Require visual verification for rendering changes
- **tdd-guide**: Add generation counter test pattern (stale write prevention)

### Workflow Fix:
- Stage 10 gate loop bug (Pattern 19) — needs fix in `workflows/super-dev.workflow.js`
