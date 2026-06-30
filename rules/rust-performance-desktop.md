---
name: rust-performance-desktop
description: "Desktop latency optimization — pre-created windows, FIFO IPC, generation counters, lock-free fast paths, release profiles"
---

<purpose>Enforce proven desktop latency optimization patterns from production GPUI/Wayland applications. These patterns eliminate 10-40ms latency cliffs that make desktop apps feel sluggish.</purpose>

<directives>
  <directive severity="critical" name="Generation Counter Before Cancel">When replacing sessions/connections/streams, ALWAYS increment the generation counter BEFORE cancelling the old session. This makes in-flight writes from the old session no-ops (they check `my_gen != current_gen`). Cancelling first creates a window where stale data can land after cancel but before new session starts.</directive>
  <directive severity="critical" name="Pre-Create Transient Windows">For frequently-shown/hidden UI (launchers, command palettes, search overlays), pre-create the window at startup positioned off-screen (-32768, -32768). Show = reposition + activate (~0.1ms). Hide = reposition off-screen (~0.1ms). This eliminates the 15-40ms `open_window()` cost on every show.</directive>
  <directive severity="high" name="Lock-Free Fast Path for Latency-Sensitive Loops">When an event loop (60Hz+) needs a summary value from shared state, expose BOTH: (1) an `AtomicU8/AtomicU64` for the fast path (~1ns), and (2) a `Mutex<DetailedReport>` for on-demand full data (~50ns). Writers update both. The event loop uses the atomic; detailed consumers use the mutex.</directive>
  <directive severity="high" name="Named FIFO for Fire-and-Forget Signals">For unidirectional signals (show, hide, reindex) where no response is needed, use a Named FIFO (~10µs) instead of UDS connect+send+response (~100µs). Keep UDS for request-response operations (query, status). The 10x latency difference is measurable in user perception.</directive>
  <directive severity="high" name="Release Profile for Desktop Apps">Desktop apps MUST ship with aggressive release optimizations: `opt-level = 3`, `lto = "fat"`, `codegen-units = 1`, `strip = true`, `panic = "abort"`. Consider `mimalloc` as the global allocator for allocation-heavy UI rendering.</directive>
  <directive severity="medium" name="Frame Freshness Tracking">For pre-created windows, track whether the pre-rendered frame is current (fresh) or stale (needs re-render). Coalesce rapid invalidations via a `render_pending` flag. Re-render on data change; present immediately on show.</directive>
  <directive severity="medium" name="mlockall for Latency-Critical Daemons">For always-resident daemons that must respond in <16ms, call `mlockall(MCL_CURRENT|MCL_FUTURE)` to prevent page faults. Only use for small-footprint processes (launchers, status bars), not memory-heavy apps.</directive>
</directives>

<patterns>
  <pattern name="Session Generation Counter" severity="critical">
    <description>Prevents stale writes from overlapping sessions. The generation is an AtomicU64 checked by all background tasks before writing results.</description>
    <example>
    pub struct SessionManager {
        generation: Arc&lt;AtomicU64&gt;,
        session: Option&lt;Session&gt;,
    }
    
    impl SessionManager {
        pub fn start_new_session(&amp;mut self) {
            // 1. Increment generation FIRST (makes in-flight stale)
            let gen = self.generation.fetch_add(1, Ordering::Release);
            // 2. Cancel old session
            if let Some(old) = self.session.take() {
                old.cancel.cancel();
            }
            // 3. Start new with captured generation
            let my_gen = gen + 1;
            let cancel = CancellationToken::new();
            // Pass my_gen to all spawned tasks
            spawn_worker(my_gen, self.generation.clone(), cancel.clone());
            self.session = Some(Session { cancel });
        }
    }
    
    // In worker task:
    async fn worker(my_gen: u64, current_gen: Arc&lt;AtomicU64&gt;, cancel: CancellationToken) {
        let result = do_work().await;
        // Check generation before writing — prevents stale results
        if current_gen.load(Ordering::Acquire) != my_gen { return; }
        store_result(result);
    }
    </example>
  </pattern>
  <pattern name="Pre-Created Hidden Window" severity="high">
    <description>Window created at startup, positioned off-screen. Show/hide via reposition instead of create/destroy.</description>
    <example>
    // GPUI Global holding the pre-created window handle
    pub struct PreCreatedWindow(pub Option&lt;WindowHandle&lt;MyView&gt;&gt;);
    impl Global for PreCreatedWindow {}
    
    // At startup (inside Application::run closure):
    let options = WindowOptions {
        bounds: WindowBounds::Windowed(Bounds {
            origin: point(px(-32768.), px(-32768.)),  // Off-screen
            size: size(px(800.), px(600.)),
        }),
        kind: WindowKind::PopUp,  // No taskbar entry
        ..Default::default()
    };
    let handle = cx.open_window(options, |_, cx| { /* build view */ });
    cx.set_global(PreCreatedWindow(Some(handle)));
    
    // Show: reposition to screen center
    // Hide: reposition back to (-32768, -32768)
    </example>
  </pattern>
  <pattern name="Named FIFO Signal Protocol" severity="medium">
    <description>Single-byte signals over a named FIFO for fire-and-forget IPC.</description>
    <example>
    // Signal constants
    pub const SIGNAL_SHOW: u8 = b'S';
    pub const SIGNAL_HIDE: u8 = b'H';
    
    pub fn daemon_fifo_path() -&gt; PathBuf {
        let runtime_dir = std::env::var("XDG_RUNTIME_DIR").unwrap_or("/tmp".into());
        PathBuf::from(runtime_dir).join("my-app.fifo")
    }
    
    // Sender (~10µs):
    pub fn send_signal(signal: u8) -&gt; io::Result&lt;()&gt; {
        let mut f = OpenOptions::new().write(true).open(daemon_fifo_path())?;
        f.write_all(&amp;[signal])
    }
    
    // Receiver (async loop with RAII cleanup):
    struct FifoCleanup(PathBuf);
    impl Drop for FifoCleanup {
        fn drop(&amp;mut self) { let _ = std::fs::remove_file(&amp;self.0); }
    }
    </example>
  </pattern>
  <pattern name="Dual-Access State (Atomic + Mutex)" severity="high">
    <description>Expose both lock-free and detailed access to the same state for different consumers.</description>
    <example>
    pub struct SharedState {
        // Fast path: ~1ns, for event loop (60Hz polling)
        health_atomic: Arc&lt;AtomicU8&gt;,
        // Slow path: ~50ns, for UI updates (on-demand)
        report: Arc&lt;parking_lot::Mutex&lt;DetailedReport&gt;&gt;,
    }
    
    // Writer (background task) updates BOTH:
    fn update_health(&amp;self, health: Health) {
        self.report.lock().health = health;
        self.health_atomic.store(health.encode(), Ordering::Release);
    }
    
    // Fast reader (event loop):
    fn health_fast(&amp;self) -&gt; Health {
        Health::decode(self.health_atomic.load(Ordering::Acquire))
    }
    
    // Detailed reader (UI):
    fn report(&amp;self) -&gt; DetailedReport {
        self.report.lock().clone()
    }
    </example>
  </pattern>
</patterns>

<release-profile>
  <description>Optimal Cargo release profile for desktop applications:</description>
  <toml>
  [profile.release]
  opt-level = 3
  lto = "fat"
  codegen-units = 1
  strip = true
  panic = "abort"
  
  # Optional: mimalloc global allocator (add to main.rs)
  # use mimalloc::MiMalloc;
  # #[global_allocator]
  # static GLOBAL: MiMalloc = MiMalloc;
  </toml>
</release-profile>

<checklist>
  <check>Generation counter incremented BEFORE cancel on session replacement</check>
  <check>Transient UI pre-created and shown/hidden via reposition</check>
  <check>Latency-sensitive loops use atomic fast paths (no mutex on hot path)</check>
  <check>Fire-and-forget IPC uses FIFO (not UDS) where response not needed</check>
  <check>Release profile includes LTO + codegen-units=1 + strip</check>
  <check>Background tasks check generation before writing results</check>
  <check>Frame freshness tracked for pre-created windows</check>
</checklist>
