---
name: research-report-template
description: Structured research report template with source inventory, options comparison matrix, confidence levels, and actionable recommendations with citations.
doc-type: research-report
gate-profile: null
---

<document type="research-report">

<metadata>
  <field name="title">Research Report: [Topic]</field>
  <field name="date">[timestamp]</field>
  <field name="author">super-dev:research-agent</field>
  <field name="research-period">[start date] to [end date]</field>
  <field name="technologies">[comma-separated list of technologies researched]</field>
  <field name="freshness">Fresh (< 6mo) | Current (6-18mo) | Dated (18-36mo) | Outdated (> 36mo)</field>
</metadata>

<section title="Executive Summary">
  <list type="unordered">
    <item>[Key finding 1]</item>
    <item>[Key finding 2]</item>
    <item>[Key finding 3]</item>
  </list>
  <paragraph label="Recommendation">[1-2 sentence primary recommendation with confidence level]</paragraph>
</section>

<section title="Search Methodology">
  <table>
    <row header="true">
      <cell>Query</cell>
      <cell>Tool</cell>
      <cell>Results</cell>
      <cell>Useful</cell>
    </row>
    <row>
      <cell>[search query]</cell>
      <cell>[Firecrawl/WebSearch/WebFetch]</cell>
      <cell>[count]</cell>
      <cell>[count]</cell>
    </row>
  </table>
</section>

<section title="Source Inventory">
  <table>
    <row header="true">
      <cell>ID</cell>
      <cell>Source</cell>
      <cell>Type</cell>
      <cell>Date</cell>
      <cell>Recency</cell>
      <cell>Confidence</cell>
    </row>
    <row>
      <cell>SRC-001</cell>
      <cell>[title + URL]</cell>
      <cell>[Official docs / Blog / GitHub / Paper / Community]</cell>
      <cell>[publication date]</cell>
      <cell>[Fresh/Current/Dated/Outdated]</cell>
      <cell>[High/Medium/Low]</cell>
    </row>
    <row>
      <cell>SRC-002</cell>
      <cell>[title + URL]</cell>
      <cell>[type]</cell>
      <cell>[date]</cell>
      <cell>[recency]</cell>
      <cell>[confidence]</cell>
    </row>
  </table>

  <rule>Minimum 3 sources required. Official documentation sources score HIGH confidence. Community sources (blog, Reddit, X/Twitter) score MEDIUM unless corroborated. Single-source claims score LOW.</rule>
</section>

<section title="Options Comparison">
  <paragraph>REQUIRED: Compare 3-5 viable options identified during research.</paragraph>

  <table>
    <row header="true">
      <cell>Criterion</cell>
      <cell>Option A: [name]</cell>
      <cell>Option B: [name]</cell>
      <cell>Option C: [name]</cell>
    </row>
    <row><cell>Maturity</cell><cell>[score 1-5]</cell><cell>[score 1-5]</cell><cell>[score 1-5]</cell></row>
    <row><cell>Community/Support</cell><cell>[score 1-5]</cell><cell>[score 1-5]</cell><cell>[score 1-5]</cell></row>
    <row><cell>Performance</cell><cell>[score 1-5]</cell><cell>[score 1-5]</cell><cell>[score 1-5]</cell></row>
    <row><cell>Bundle Size / Footprint</cell><cell>[score 1-5]</cell><cell>[score 1-5]</cell><cell>[score 1-5]</cell></row>
    <row><cell>Learning Curve</cell><cell>[score 1-5]</cell><cell>[score 1-5]</cell><cell>[score 1-5]</cell></row>
    <row><cell>Maintenance Burden</cell><cell>[score 1-5]</cell><cell>[score 1-5]</cell><cell>[score 1-5]</cell></row>
    <row><cell>Project Fit</cell><cell>[score 1-5]</cell><cell>[score 1-5]</cell><cell>[score 1-5]</cell></row>
    <row><cell>TOTAL</cell><cell>[sum]</cell><cell>[sum]</cell><cell>[sum]</cell></row>
  </table>

  <subsection title="Option A: [Name]">
    <list type="unordered">
      <item name="Strengths">[strengths with SRC-NNN citations]</item>
      <item name="Weaknesses">[weaknesses with SRC-NNN citations]</item>
      <item name="Best For">[use case fit]</item>
    </list>
  </subsection>

  <subsection title="Option B: [Name]">
    <list type="unordered">
      <item name="Strengths">[strengths with SRC-NNN citations]</item>
      <item name="Weaknesses">[weaknesses with SRC-NNN citations]</item>
      <item name="Best For">[use case fit]</item>
    </list>
  </subsection>

  <subsection title="Option C: [Name]">
    <list type="unordered">
      <item name="Strengths">[strengths with SRC-NNN citations]</item>
      <item name="Weaknesses">[weaknesses with SRC-NNN citations]</item>
      <item name="Best For">[use case fit]</item>
    </list>
  </subsection>
</section>

<section title="Deprecation Warnings">
  <paragraph>Libraries, APIs, or patterns that are deprecated or approaching end-of-life:</paragraph>
  <table>
    <row header="true">
      <cell>Item</cell>
      <cell>Status</cell>
      <cell>Deadline</cell>
      <cell>Migration Path</cell>
      <cell>Source</cell>
    </row>
    <row>
      <cell>[library/API/pattern]</cell>
      <cell>[Deprecated/EOL/Superseded]</cell>
      <cell>[date or "already"]</cell>
      <cell>[recommended replacement]</cell>
      <cell>SRC-NNN</cell>
    </row>
  </table>
  <paragraph>[If none: "No deprecation concerns identified for current stack."]</paragraph>
</section>

<section title="Best Practices">
  <paragraph>Recommended patterns from authoritative sources:</paragraph>

  <subsection title="BP-001: [Practice Title]">
    <field name="pattern">[description of the recommended approach]</field>
    <field name="rationale">[why this is recommended]</field>
    <field name="source">SRC-NNN</field>
    <field name="confidence">High | Medium | Low</field>
    <field name="example">
      <code lang="[language]">
[minimal code example if applicable]
      </code>
    </field>
  </subsection>

  <!-- Repeat for each best practice -->
</section>

<section title="Anti-Patterns">
  <table>
    <row header="true">
      <cell>Anti-Pattern</cell>
      <cell>Why Harmful</cell>
      <cell>Alternative</cell>
      <cell>Source</cell>
    </row>
    <row>
      <cell>[pattern to avoid]</cell>
      <cell>[concrete harm]</cell>
      <cell>[what to do instead]</cell>
      <cell>SRC-NNN</cell>
    </row>
  </table>
</section>

<section title="Implementation Considerations">
  <subsection title="Performance">
    <list type="unordered">
      <item>[consideration with SRC-NNN citation]</item>
    </list>
  </subsection>

  <subsection title="Security">
    <list type="unordered">
      <item>[consideration with SRC-NNN citation]</item>
    </list>
  </subsection>

  <subsection title="Compatibility">
    <list type="unordered">
      <item>[browser/runtime/OS compatibility notes]</item>
    </list>
  </subsection>
</section>

<section title="Contradictions Found">
  <paragraph>Sources that disagree on key points:</paragraph>
  <table>
    <row header="true">
      <cell>Topic</cell>
      <cell>Position A (SRC-NNN)</cell>
      <cell>Position B (SRC-NNN)</cell>
      <cell>Assessment</cell>
    </row>
    <row>
      <cell>[topic]</cell>
      <cell>[claim from source A]</cell>
      <cell>[opposing claim from source B]</cell>
      <cell>[which is more credible and why]</cell>
    </row>
  </table>
  <paragraph>[If none: "No contradictions found across sources."]</paragraph>
</section>

<section title="Issues and Ambiguities">
  <paragraph>Items needing deeper investigation or user decision:</paragraph>
  <list type="unordered">
    <item name="ISS-001">[issue description — what is unclear and why it matters]</item>
    <item name="ISS-002">[issue description]</item>
  </list>
</section>

<section title="References">
  <subsection title="Primary Sources (Official Documentation)">
    <list type="unordered">
      <item>SRC-001: [title] — [URL]</item>
    </list>
  </subsection>

  <subsection title="Secondary Sources (Blogs, Papers, Guides)">
    <list type="unordered">
      <item>SRC-002: [title] — [URL]</item>
    </list>
  </subsection>

  <subsection title="Community Sources (GitHub, Reddit, X/Twitter)">
    <list type="unordered">
      <item>SRC-003: [title] — [URL]</item>
    </list>
  </subsection>
</section>

</document>

## Gate Compliance Notes

This template does NOT have a dedicated gate script (gate-profile: null). However, it is consumed by:
- **architecture-designer** (Stage 6): parses Options Comparison and Best Practices
- **spec-writer** (Stage 7): parses Best Practices, Anti-Patterns, and Implementation Considerations
- **code-assessor** (Stage 5): may use as input when research_findings is provided

To ensure reliable downstream parsing:
1. Source IDs MUST use format: `SRC-NNN` (zero-padded, e.g., SRC-001)
2. Best Practice IDs MUST use format: `BP-NNN`
3. Issue IDs MUST use format: `ISS-NNN`
4. Confidence values MUST be one of: `High`, `Medium`, `Low`
5. Recency/Freshness values MUST be one of: `Fresh`, `Current`, `Dated`, `Outdated`
6. Options Comparison table MUST have at least 3 options with numeric scores (1-5)
7. Every claim MUST cite at least one SRC-NNN reference
8. Contradictions section MUST be present (even if "No contradictions found")
