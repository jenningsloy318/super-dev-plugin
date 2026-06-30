---
name: rust-gpui-patterns
description: "GPUI desktop application patterns — state management, platform abstraction, rendering, event handling, window lifecycle"
---

<purpose>Enforce battle-tested GPUI desktop application patterns derived from production Rust/GPUI projects (woo-tv, woo-launcher, live-Cap). Prevents common GPUI pitfalls and ensures consistent architecture across desktop apps.</purpose>

<directives>
  <directive severity="critical" name="Always cx.notify() After State Mutation">Every state mutation that should trigger a re-render MUST call `cx.notify()` immediately after. GPUI does not auto-detect state changes — without `cx.notify()`, the UI will NOT update. This is the #1 source of "why isn't my UI updating?" bugs.</directive>
  <directive severity="critical" name="Single RootView Per Window">Each window uses ONE root view struct that conditionally renders content based on navigation state. Do NOT create multiple RootViews per window. Separate logical windows (e.g., Settings) get their own `cx.open_window()` call with a different root view type.</directive>
  <directive severity="critical" name="Dual-State Architecture">Separate UI-local state from shared persistent state:
  - `UIState`: UI thread only, no locks (~5ns access). Navigation, scroll positions, dialog open/closed, popovers.
  - `AppSettings` / `SharedState`: `Arc<RwLock<...>>` for cross-task access (~50-500ns). User preferences, persisted config, data that background tasks read/write.
  Never put navigation/scroll state behind a lock. Never put persisted preferences in UI-only state.</directive>
  <directive severity="critical" name="Exit Hooks Must Be Synchronous">GPUI's `cx.on_app_quit()` callback returns `async {}` but the actual cleanup logic MUST be synchronous. The async block is a compatibility signature, not an invitation to `.await`. Write persistence/flush logic synchronously inside the callback.</directive>
  <directive severity="high" name="Dialog Pattern: occlude + mouse_down_out">`div().occlude()` prevents events from passing through to content below. `.on_mouse_down_out(cx.listener(|this, _, _, cx| { this.close_dialog(); cx.notify(); }))` closes on outside click. Both are required for correct modal behavior.</directive>
  <directive severity="high" name="FocusHandle Required for Keyboard Actions">Window-level keyboard shortcuts via `actions!()` + `cx.bind_keys()` + `on_action()` require a `FocusHandle` with `track_focus` on the root view. Without FocusHandle, GPUI cannot route key-bound actions. Use this pattern (not `on_key_down`) for app-level shortcuts.</directive>
  <directive severity="high" name="Store Task Handles to Prevent Cancellation">GPUI's `cx.spawn()` returns a `Task<T>`. If the Task is dropped, the spawned future is CANCELLED. Store tasks in struct fields (or a GPUI Global) to keep them alive. Common pattern: `struct DrainTask(#[allow(dead_code)] gpui::Task<()>); impl gpui::Global for DrainTask {}`</directive>
  <directive severity="high" name="Background Executor for Blocking Work">`cx.background_executor()` for SQLite/filesystem operations. Create a separate `LazyLock<Runtime>` (tokio) for network/API calls. Never block the GPUI main thread with I/O.</directive>
  <directive severity="medium" name="Conditional Rendering Idioms">Use `.when(bool, |el| el.child(...))` and `.when_some(option, |el, val| el.child(...))` for conditional UI. For complex branching with ownership constraints (RenderOnce), use `if/else` blocks — `.when()` chains don't work when elements consume `self`.</directive>
  <directive severity="medium" name="Subscription Lifecycle">Store subscriptions (window observers, screen change, app quit) in struct fields. Dropped subscriptions are automatically cancelled. Pattern: `self._quit_subscription = Some(cx.on_app_quit(...))`.</directive>
</directives>

<patterns>
  <pattern name="Platform Module Dispatcher (Zero-Cost)" severity="high">
    <description>cfg-gated module selection with named re-exports. Compile-time dispatch, zero runtime cost. Each platform module exports the same public API surface.</description>
    <example>
    // crates/config/src/platform/mod.rs
    #[cfg(target_os = "linux")]
    mod linux;
    #[cfg(target_os = "linux")]
    pub use linux::{get_config_dir, get_cache_dir};

    #[cfg(target_os = "macos")]
    mod macos;
    #[cfg(target_os = "macos")]
    pub use macos::{get_config_dir, get_cache_dir};

    #[cfg(target_os = "windows")]
    mod windows;
    #[cfg(target_os = "windows")]
    pub use windows::{get_config_dir, get_cache_dir};
    </example>
    <scope>Used in crates that have OS-specific behavior (config paths, window options, audio/video backends, hardware access).</scope>
  </pattern>
  <pattern name="GPUI Global for Process-Wide State" severity="medium">
    <description>Use GPUI's Global trait for process-wide singletons accessible from any GPUI context. Preferred over lazy_static for GPUI-integrated state.</description>
    <example>
    struct PreCreatedWindow(pub Option&lt;WindowHandle&lt;MainView&gt;&gt;);
    impl gpui::Global for PreCreatedWindow {}

    // Set:
    cx.set_global(PreCreatedWindow(None));
    // Update:
    cx.update_global::&lt;PreCreatedWindow, _&gt;(|pcw, _| pcw.0 = Some(handle));
    // Read:
    cx.try_global::&lt;PreCreatedWindow&gt;().and_then(|pcw| pcw.0)
    </example>
  </pattern>
  <pattern name="Worker Thread + Bridge Channel" severity="high">
    <description>GPUI owns the main thread. Heavy work (tokio runtime, IPC, filesystem watching) runs on a dedicated worker thread communicating via unbounded mpsc. Pattern: worker → main via BridgeMsg, main → worker via oneshot for shutdown handshake.</description>
    <example>
    // Worker thread hosts tokio runtime
    let (bridge_tx, bridge_rx) = tokio::sync::mpsc::unbounded_channel::&lt;BridgeMsg&gt;();
    let (quit_done_tx, quit_done_rx) = tokio::sync::oneshot::channel();
    std::thread::spawn(move || {
        let rt = tokio::runtime::Builder::new_multi_thread().enable_all().build().unwrap();
        rt.block_on(async { /* IPC server, watcher, signal loop */ });
    });
    // GPUI main thread drains bridge_rx via cx.spawn()
    </example>
  </pattern>
  <pattern name="Theme Tokens via AtomicU8 + Branch" severity="medium">
    <description>Theme switching without locks: global AtomicU8 for mode, all color functions branch on `is_dark_mode()`. LazyLock&lt;HashMap&gt; for i18n string tables.</description>
    <example>
    static THEME_MODE: AtomicU8 = AtomicU8::new(0); // 0=light, 1=dark
    pub fn set_theme_mode(dark: bool) { THEME_MODE.store(dark as u8, Ordering::Relaxed); }
    pub fn is_dark_mode() -> bool { THEME_MODE.load(Ordering::Relaxed) != 0 }
    pub fn theme_bg_color() -> Hsla {
        if is_dark_mode() { hsla(0., 0., 0., 1.) } else { hsla(0., 0., 0.96, 1.) }
    }
    </example>
  </pattern>
</patterns>

<workspace-structure name="Desktop App Workspace Convention">
  <description>Standard crate layout for GPUI desktop applications (10-crate pattern):</description>
  <layout>
  crates/
  ├── app/           # Main binary, window initialization, keyboard bindings
  │   └── platform/  #   Window options, app identity, post-open hooks (per-OS)
  ├── ui/            # GPUI views (windows, page views, navigation)
  ├── components/    # Reusable UI components (cards, dialogs, sections)
  ├── state/         # State management (UIState, AppSettings)
  ├── config/        # Persistence, config directory management
  │   └── platform/  #   Config directory paths (per-OS)
  ├── theme/         # Design tokens (colors, spacing, typography), i18n
  └── core/          # Core business logic (no UI dependency)
  </layout>
  <dep-flow>theme → state/config → components → ui → app (no circular deps)</dep-flow>
</workspace-structure>

<checklist>
  <check>Every state mutation that affects rendering is followed by cx.notify()</check>
  <check>One root view per window, conditional rendering inside it</check>
  <check>UIState (no lock) vs SharedState (Arc+RwLock) separation is clear</check>
  <check>Platform-specific code uses cfg-gated module dispatchers</check>
  <check>Task handles stored to prevent cancellation</check>
  <check>Background executor used for disk I/O, separate runtime for network</check>
  <check>FocusHandle + track_focus present when keyboard actions are registered</check>
  <check>Subscriptions stored in struct fields</check>
  <check>Exit hook logic is synchronous</check>
</checklist>
