---
name: llm-integration-patterns
description: "LLM API integration — parallel calls, robust parsing, tag preservation, caching, retry, graceful degradation"
---

<purpose>Enforce battle-tested patterns for integrating LLM APIs (OpenAI, Anthropic, etc.) into consumer applications. Derived from production Android app with 138 unit tests covering translation, summarization, and rich-text preservation through LLM processing.</purpose>

<directives>
  <directive severity="critical" name="Defense-in-Depth Response Parsing">NEVER rely on a single JSON.parse for LLM output. Implement a 4+ tier extraction chain: (1) markdown code block extraction, (2) generic code block extraction, (3) brace-matching JSON object extraction from arbitrary text, (4) legacy/fallback format parser. LLMs add preamble, wrap in markdown, truncate, or produce legacy formats 15-20% of the time.</directive>
  <directive severity="critical" name="Bounded Parallel LLM Calls">For N independent LLM operations (e.g., translating N paragraphs), use `Semaphore(K) + parallel spawn + channel/flow` for bounded concurrency with streaming progress. K=3 is the sweet spot for most APIs (avoids rate limits while maximizing throughput). Each completed item streams to UI immediately — don't wait for all to finish.</directive>
  <directive severity="high" name="Retry with Backoff for Retryable Errors">LLM API calls MUST have retry logic with exponential backoff. Distinguish retryable errors (rate limit 429, timeout, 5xx) from non-retryable (auth 401, bad request 400, content policy). Default: 3 retries with 2^attempt seconds backoff. Non-retryable errors fail immediately.</directive>
  <directive severity="high" name="Cache Expensive LLM Results">LLM-generated content (translations, summaries) MUST be cached with a deterministic key (entity_id + parameters + language). Use gzip compression (70-80% savings for text). Include forward-compatible deserialization (`ignoreUnknownKeys` / `#[serde(deny_unknown_fields)]` OFF). Implement orphan cleanup in the entity deletion path.</directive>
  <directive severity="high" name="Rich Text Preservation via XML Tags">When LLM must process rich text (bold, links, code), convert to plain text with XML-like tags before sending: `"Click <link href='url'>here</link> for <b>details</b>"`. LLMs understand XML well and preserve structure while transforming content. Parse tags back with a non-throwing single-pass state machine.</directive>
  <directive severity="medium" name="Cancellation Support">Every LLM operation MUST be cancellable. Store the job/task handle. On cancel, catch CancellationException and rethrow BEFORE the general exception handler. UI shows cancel affordance (stop button) with circular progress.</directive>
  <directive severity="medium" name="Error Sanitization">Strip JSON/structured data from error messages before showing to users. LLM response bodies often contain full JSON in error responses that would confuse users. Use `sanitizeErrorMessage()` pattern.</directive>
</directives>

<patterns>
  <pattern name="Parallel Translation Coordinator" severity="high">
    <description>Bounded concurrent LLM calls with per-item streaming progress. Each completed item immediately updates UI.</description>
    <example lang="rust">
    // Rust equivalent of the Kotlin channelFlow + Semaphore pattern
    pub async fn translate_parallel(
        paragraphs: Vec&lt;String&gt;,
        target: Language,
        concurrency: usize,  // 3
        max_retries: usize,  // 3
    ) -> mpsc::Receiver&lt;TranslationProgress&gt; {
        let (tx, rx) = mpsc::channel(paragraphs.len());
        let semaphore = Arc::new(Semaphore::new(concurrency));
        
        for (idx, text) in paragraphs.into_iter().enumerate() {
            let sem = semaphore.clone();
            let tx = tx.clone();
            tokio::spawn(async move {
                let _permit = sem.acquire().await.unwrap();
                let result = translate_with_retry(&amp;text, target, max_retries).await;
                let _ = tx.send(TranslationProgress { idx, result }).await;
            });
        }
        rx
    }
    </example>
  </pattern>
  <pattern name="Brace-Matching JSON Extraction" severity="critical">
    <description>Extract a JSON object from LLM output that may contain markdown, preamble text, or other wrapping.</description>
    <example lang="rust">
    pub fn extract_json_object(content: &amp;str) -> Option&lt;&amp;str&gt; {
        // Strategy 1: Try ```json code block
        if let Some(json) = extract_from_code_block(content, "json") {
            return Some(json);
        }
        // Strategy 2: Try generic ``` code block
        if let Some(json) = extract_from_code_block(content, "") {
            return Some(json);
        }
        // Strategy 3: Brace-matching from first '{'
        let start = content.find('{')?;
        let mut depth = 0i32;
        let mut in_string = false;
        let mut escape_next = false;
        
        for (i, ch) in content[start..].char_indices() {
            if escape_next { escape_next = false; continue; }
            if ch == '\\' &amp;&amp; in_string { escape_next = true; continue; }
            if ch == '"' { in_string = !in_string; continue; }
            if in_string { continue; }
            match ch {
                '{' => depth += 1,
                '}' => {
                    depth -= 1;
                    if depth == 0 {
                        return Some(&amp;content[start..=start + i]);
                    }
                }
                _ => {}
            }
        }
        None // Truncated JSON
    }
    </example>
  </pattern>
  <pattern name="XML Tag Preservation for Rich Text" severity="high">
    <description>Convert rich text to tagged plain text for LLM processing, then parse back.</description>
    <example>
    // 10 supported tag types:
    // b, i, code, link (with href attr), s, u, sup, sub, mono, font
    
    // Before sending to LLM:
    // "Click **here** for `details`" 
    //   → "Click &lt;b&gt;here&lt;/b&gt; for &lt;code&gt;details&lt;/code&gt;"
    
    // Prompt instruction:
    // "Translate to {language}. Preserve all XML tags exactly as-is."
    
    // After receiving translation:
    // Parse with single-pass state machine (never throws)
    // Falls back to plain text on malformed input
    // Uses style stack for nested tags
    
    struct TagEntry { tag_name: String, style: Option&lt;Style&gt;, link_href: Option&lt;String&gt; }
    let mut style_stack: Vec&lt;TagEntry&gt; = Vec::new();
    // Walk chars: accumulate text until '&lt;', then parse tag, push/pop stack
    </example>
  </pattern>
  <pattern name="Translation Cache (Gzip JSON Blob)" severity="medium">
    <description>Cache LLM results with deterministic keys, gzip compression, and orphan cleanup.</description>
    <example>
    // Key: {entity_id}_{target_language}.translation.json.gz
    // Location: app_data_dir/translations/
    
    pub fn save_translation(id: &amp;str, lang: &amp;str, data: &amp;TranslationData) -> Result&lt;()&gt; {
        let path = translations_dir().join(format!("{id}_{lang}.translation.json.gz"));
        let json = serde_json::to_vec(data)?;
        let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
        encoder.write_all(&amp;json)?;
        std::fs::write(path, encoder.finish()?)?;
        Ok(())
    }
    
    pub fn load_translation(id: &amp;str, lang: &amp;str) -> Option&lt;TranslationData&gt; {
        let path = translations_dir().join(format!("{id}_{lang}.translation.json.gz"));
        let compressed = std::fs::read(&amp;path).ok()?;
        let mut decoder = GzDecoder::new(&amp;compressed[..]);
        let mut json = Vec::new();
        decoder.read_to_end(&amp;mut json).ok()?;
        serde_json::from_slice(&amp;json).ok() // ignoreUnknownKeys equivalent
    }
    
    // Cleanup: in entity deletion path
    pub fn delete_translations_for(id: &amp;str) {
        let dir = translations_dir();
        for entry in std::fs::read_dir(&amp;dir).into_iter().flatten() {
            if let Ok(e) = entry {
                if e.file_name().to_str().map_or(false, |n| n.starts_with(&amp;format!("{id}_"))) {
                    let _ = std::fs::remove_file(e.path());
                }
            }
        }
    }
    </example>
  </pattern>
  <pattern name="Retry with Exponential Backoff (Retryable Classification)" severity="high">
    <description>Classify errors and only retry retryable ones. Exponential backoff prevents thundering herd.</description>
    <example>
    fn is_retryable(status: StatusCode) -> bool {
        matches!(status.as_u16(), 429 | 500 | 502 | 503 | 504)
    }
    
    async fn call_with_retry&lt;T&gt;(
        request: impl Fn() -> impl Future&lt;Output = Result&lt;T&gt;&gt;,
        max_retries: usize,
    ) -> Result&lt;T&gt; {
        let mut last_error = None;
        for attempt in 0..=max_retries {
            match request().await {
                Ok(result) => return Ok(result),
                Err(e) if attempt &lt; max_retries &amp;&amp; is_retryable_error(&amp;e) => {
                    let delay = Duration::from_secs(2u64.pow(attempt as u32));
                    tokio::time::sleep(delay).await;
                    last_error = Some(e);
                }
                Err(e) => return Err(e), // Non-retryable, fail immediately
            }
        }
        Err(last_error.unwrap())
    }
    </example>
  </pattern>
</patterns>

<anti-patterns>
  <anti-pattern>Single JSON.parse on LLM output without fallback chain</anti-pattern>
  <anti-pattern>Unbounded parallel LLM calls (will hit rate limits immediately)</anti-pattern>
  <anti-pattern>Waiting for ALL parallel LLM calls before showing any progress</anti-pattern>
  <anti-pattern>Retrying non-retryable errors (401, 400) with backoff</anti-pattern>
  <anti-pattern>Stripping rich text before LLM processing (loses formatting permanently)</anti-pattern>
  <anti-pattern>Showing raw JSON in error messages to users</anti-pattern>
  <anti-pattern>No cache for expensive LLM results (re-translating same content)</anti-pattern>
</anti-patterns>

<checklist>
  <check>LLM response parsing has 4+ fallback tiers</check>
  <check>Parallel LLM calls bounded by semaphore (K=3 default)</check>
  <check>Each completed item streams to UI immediately</check>
  <check>Retry logic distinguishes retryable vs non-retryable errors</check>
  <check>Exponential backoff on retryable errors (2^attempt seconds)</check>
  <check>LLM results cached with deterministic key + gzip</check>
  <check>Rich text preserved via XML tags through LLM processing</check>
  <check>Tag parser is non-throwing (falls back to plain text)</check>
  <check>Operations are cancellable with visible cancel affordance</check>
  <check>Error messages sanitized before user display</check>
  <check>Cache has orphan cleanup in entity deletion path</check>
</checklist>
