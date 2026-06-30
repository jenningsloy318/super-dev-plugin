---
name: rust-security-hardening
description: "Network service security — rate limiting, connection gating, RAII permits, hot-reload, fuzz infrastructure, graceful degradation"
---

<purpose>Enforce production security patterns for Rust network services derived from a 40-spec RDP server (wooRDP) with 14 fuzz targets, Miri annotations, and supply-chain auditing. These patterns prevent DoS, resource exhaustion, and unauthorized access.</purpose>

<directives>
  <directive severity="critical" name="SecurityGate Cascade (Cheapest First)">Network services MUST gate incoming connections through layered checks ordered cheapest→expensive: (1) IP filter (O(1) hash), (2) Rate limiter (lock-free atomic CAS), (3) Connection tracker (atomic counter). Each layer independently logs its deny reason. Return an RAII `ConnectionPermit` that auto-decrements on drop.</directive>
  <directive severity="critical" name="RAII Connection Permits">Connection tracking MUST use RAII guards (`ConnectionPermit`). When the permit is dropped (normal close, error, panic), the connection count is automatically decremented. Never use manual increment/decrement — it leaks on panic paths.</directive>
  <directive severity="high" name="Lock-Free Rate Limiting">Per-IP rate limiters MUST be lock-free for high-concurrency servers. Pack tokens + last_refill_timestamp into a single AtomicU64, use CAS loop for atomic refill+consume. DashMap&lt;IpAddr, TokenBucket&gt; for per-IP isolation.</directive>
  <directive severity="high" name="Hot-Reload via ArcSwap">Security configuration (IP lists, TLS certificates) MUST be hot-reloadable without restart. Use `ArcSwap` for the active config. On SIGHUP: load new config, validate, swap atomically. In-flight connections continue with old config; new connections use new config.</directive>
  <directive severity="high" name="Structured Audit Events">Security events (accept, deny, rate-limit) MUST emit structured audit logs with: IP, deny reason, per-IP sequence number, timestamp. Format compatible with fail2ban for automatic blocking. Use a per-IP `AuditSequencer` for sequence numbers to detect replay/reorder.</directive>
  <directive severity="medium" name="Fuzz Testing Infrastructure">Security-sensitive crates MUST have fuzz targets. Pattern: per-crate `fuzz_api` module behind `#[cfg(feature = "fuzzing")]` feature gate. Top-level `fuzz/` workspace with libfuzzer-sys targets. CI runs regression corpus on every PR; nightly runs 30min/target.</directive>
  <directive severity="medium" name="PDU/Protocol Validation">Every incoming protocol message MUST be validated before processing: size limits, field ranges, enum variants, UTF-8 validity. Reject malformed input at the boundary with a structured error (not panic). Log invalid PDUs at WARN with source IP.</directive>
  <directive severity="medium" name="Supply Chain Auditing">`deny.toml` (cargo-deny) blocks: unmaintained crates, known vulnerable versions, copyleft licenses in non-copyleft projects. `audit.toml` (cargo-audit) runs in CI. `SECURITY.md` documents disclosure policy.</directive>
</directives>

<patterns>
  <pattern name="SecurityGate Facade" severity="critical">
    <description>Single entry point for all connection security checks. Returns RAII permit on success.</description>
    <example>
    pub struct SecurityGate {
        ip_filter: IpFilter,                    // ArcSwap for hot-reload
        rate_limiter: Arc&lt;ConnectionRateLimiter&gt;, // Per-IP token buckets
        connection_tracker: ConnectionTracker,   // Global + per-IP limits
        audit_sequencer: AuditSequencer,         // Per-IP monotonic counters
    }
    
    impl SecurityGate {
        pub fn check_connection(&amp;self, ip: IpAddr) -> Result&lt;ConnectionPermit, SecurityError&gt; {
            // Layer 1: IP allow/deny (cheapest, ~10ns)
            self.ip_filter.check(ip)
                .map_err(|reason| { self.audit_deny(ip, reason); SecurityError::Denied { ip, reason } })?;
            
            // Layer 2: Rate limit (lock-free, ~50ns)
            self.rate_limiter.check(ip)
                .map_err(|reason| { self.audit_deny(ip, reason); SecurityError::Denied { ip, reason } })?;
            
            // Layer 3: Connection count (atomic, ~20ns)
            let permit = self.connection_tracker.try_acquire(ip)
                .map_err(|reason| { self.audit_deny(ip, reason); SecurityError::Denied { ip, reason } })?;
            
            self.audit_accept(ip);
            Ok(permit)  // RAII: drop decrements count
        }
    }
    </example>
  </pattern>
  <pattern name="Packed AtomicU64 Token Bucket" severity="high">
    <description>Lock-free rate limiting by packing tokens (high 32 bits) + last_refill_ms (low 32 bits) into one atomic. CAS loop handles concurrent access.</description>
    <example>
    struct TokenBucket {
        state: AtomicU64,  // [tokens:u32 | last_refill_ms:u32]
        rate: u32,
        window_ms: u32,
    }
    
    fn pack(tokens: u32, ms: u32) -> u64 { (u64::from(tokens) &lt;&lt; 32) | u64::from(ms) }
    
    fn try_acquire(&amp;self, base: Instant) -> bool {
        let now_ms = elapsed_ms(base) as u32;
        loop {
            let current = self.state.load(Ordering::Acquire);
            let tokens = (current &gt;&gt; 32) as u32;
            let last_ms = current as u32;
            
            let elapsed = now_ms.wrapping_sub(last_ms);
            let (new_tokens, new_ms) = if elapsed >= self.window_ms {
                (self.rate.saturating_sub(1), now_ms)  // Refill + consume
            } else if tokens == 0 {
                return false;  // Rate limited
            } else {
                (tokens - 1, last_ms)  // Just consume
            };
            
            match self.state.compare_exchange_weak(
                current, pack(new_tokens, new_ms), Ordering::AcqRel, Ordering::Acquire
            ) {
                Ok(_) => return true,
                Err(_) => continue,  // CAS retry on contention
            }
        }
    }
    </example>
  </pattern>
  <pattern name="RAII ConnectionPermit" severity="critical">
    <description>Permit that auto-decrements connection count on drop, even on panic.</description>
    <example>
    pub struct ConnectionPermit {
        ip: IpAddr,
        tracker: Arc&lt;ConnectionTracker&gt;,
    }
    
    impl Drop for ConnectionPermit {
        fn drop(&amp;mut self) {
            self.tracker.release(self.ip);
            // Guaranteed to run even on panic — no leaked connections
        }
    }
    
    // Usage:
    let permit = security_gate.check_connection(client_ip)?;
    // permit lives as long as the connection handler
    // when handler returns (success or error or panic) → count decremented
    </example>
  </pattern>
  <pattern name="Hot-Reload via ArcSwap + SIGHUP" severity="high">
    <description>Atomic swap of security config without dropping connections.</description>
    <example>
    use arc_swap::ArcSwap;
    
    pub struct IpFilter {
        config: ArcSwap&lt;IpFilterConfig&gt;,
    }
    
    impl IpFilter {
        pub fn check(&amp;self, ip: IpAddr) -> Result&lt;(), DenyReason&gt; {
            let config = self.config.load();  // Arc clone, ~5ns
            if config.deny_list.contains(&amp;ip) { return Err(DenyReason::Blocked); }
            if !config.allow_list.is_empty() &amp;&amp; !config.allow_list.contains(&amp;ip) {
                return Err(DenyReason::NotAllowed);
            }
            Ok(())
        }
        
        pub fn reload(&amp;self, new_config: IpFilterConfig) {
            self.config.store(Arc::new(new_config));
            // In-flight check() calls see old config (Arc keeps alive)
            // New check() calls see new config
        }
    }
    
    // SIGHUP handler:
    tokio::signal::unix::signal(SignalKind::hangup())?.recv().await;
    let new_config = load_config_from_file()?;
    ip_filter.reload(new_config);
    info!("IP filter reloaded");
    </example>
  </pattern>
  <pattern name="Fuzz API Module Pattern" severity="medium">
    <description>Per-crate fuzzing entry points behind a feature gate.</description>
    <example>
    // In crate's src/fuzz_api.rs (only compiled with `fuzzing` feature):
    #[cfg(feature = "fuzzing")]
    pub mod fuzz_api {
        use super::*;
        
        /// Fuzz the PDU parser with arbitrary bytes
        pub fn fuzz_parse_pdu(data: &amp;[u8]) {
            let _ = PduParser::parse(data);  // Must not panic
        }
        
        /// Fuzz the rate limiter with arbitrary IP sequences
        pub fn fuzz_rate_limiter(ops: &amp;[u8]) {
            let limiter = ConnectionRateLimiter::new(&amp;default_config());
            for &amp;byte in ops {
                let ip = IpAddr::V4(Ipv4Addr::new(10, 0, 0, byte));
                let _ = limiter.check(ip);
            }
        }
    }
    
    // In fuzz/fuzz_targets/parse_pdu.rs:
    #![no_main]
    use libfuzzer_sys::fuzz_target;
    use my_crate::fuzz_api;
    fuzz_target!(|data: &amp;[u8]| { fuzz_api::fuzz_parse_pdu(data); });
    </example>
  </pattern>
</patterns>

<checklist>
  <check>All incoming connections pass through SecurityGate (no bypass path)</check>
  <check>Connection tracking uses RAII permits (drop = release)</check>
  <check>Rate limiter is lock-free (AtomicU64 CAS or similar)</check>
  <check>Security config is hot-reloadable (ArcSwap + SIGHUP)</check>
  <check>Audit events are structured and fail2ban-compatible</check>
  <check>All protocol messages validated at boundary before processing</check>
  <check>Security crates have fuzz targets behind feature gate</check>
  <check>deny.toml blocks unmaintained/vulnerable/license-incompatible deps</check>
  <check>SECURITY.md documents disclosure policy</check>
  <check>IPv4-mapped IPv6 addresses canonicalized before checks</check>
</checklist>
