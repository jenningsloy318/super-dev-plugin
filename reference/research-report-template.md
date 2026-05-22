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
    <row><cell>Innovation/Momentum</cell><cell>[score 1-5]</cell><cell>[score 1-5]</cell><cell>[score 1-5]</cell></row>
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

<section title="Community Discoveries" optional="true">
  <paragraph>Insights discovered from developer community platforms (Reddit, HN, GitHub Discussions, Dev.to, X/Twitter, Stack Overflow). Include only when community research yields relevant findings.</paragraph>

  <table>
    <row header="true">
      <cell>ID</cell>
      <cell>Insight</cell>
      <cell>Source</cell>
      <cell>Date</cell>
      <cell>Momentum</cell>
      <cell>Consensus</cell>
    </row>
    <row>
      <cell>COM-001</cell>
      <cell>[community insight or discovery]</cell>
      <cell>[platform + URL]</cell>
      <cell>[date]</cell>
      <cell>[0.0-1.0]</cell>
      <cell>[Yes/No]</cell>
    </row>
  </table>

  <rule>Momentum scoring formula: momentum = (engagement_normalized × 0.4) + (recency_score × 0.35) + (authority × 0.25). Engagement normalized 0-1 within source type. Recency: less than 3mo = 1.0, 3-6mo = 0.8, 6-12mo = 0.5, 12-18mo = 0.3, over 18mo = 0.0. Authority: verified_maintainer = 1.0, recognized_expert = 0.9, active_contributor = 0.7, general = 0.5.</rule>

  <subsection title="Community Pulse">
    <paragraph>Summary of active community discussions, recurring pain points, and novel solutions emerging from developer discourse.</paragraph>
    <list type="unordered">
      <item name="Active Discussions">[topics with high recent engagement]</item>
      <item name="Pain Points">[recurring problems the community is reporting]</item>
      <item name="Novel Solutions">[creative approaches being shared and upvoted]</item>
    </list>
  </subsection>
</section>

<section title="New Technologies and Approaches" optional="true">
  <paragraph>Technologies and approaches less than 12 months old that are relevant to the research topic. Include only when innovation_potential > 0.4.</paragraph>

  <table>
    <row header="true">
      <cell>Technology</cell>
      <cell>First Release</cell>
      <cell>Maturity</cell>
      <cell>Innovation Potential</cell>
      <cell>Relevance</cell>
      <cell>Source</cell>
    </row>
    <row>
      <cell>[technology name]</cell>
      <cell>[date of first release]</cell>
      <cell>[Early/Growing/Stable]</cell>
      <cell>[0.0-1.0]</cell>
      <cell>[High/Medium/Low]</cell>
      <cell>SRC-NNN</cell>
    </row>
  </table>

  <rule>Innovation potential formula: potential = (community_momentum × 0.3) + (problem_fit × 0.3) + (adoption_ease × 0.2) + (maturity_trajectory × 0.2). Only include technologies with potential > 0.4. Filtering criteria: first release within 12 months, active development (commits within 3 months), community traction (stars > 100 OR downloads > 1000).</rule>
</section>

<section title="AI Workflow Patterns" optional="true">
  <paragraph>Patterns discovered from AI company documentation and community practices for improving agent-assisted development workflows.</paragraph>

  <table>
    <row header="true">
      <cell>Pattern</cell>
      <cell>Category</cell>
      <cell>Source</cell>
      <cell>Applicability</cell>
    </row>
    <row>
      <cell>[pattern name and description]</cell>
      <cell>[Prompt Engineering / Agent Coordination / Tool Use / Context Management]</cell>
      <cell>SRC-NNN</cell>
      <cell>[High/Medium/Low relevance to current task]</cell>
    </row>
  </table>
</section>

<section title="Internal Improvement Suggestions" optional="true">
  <paragraph>Findings from research that could improve the super-dev plugin workflow itself. Include only when research yields applicable improvements.</paragraph>

  <list type="unordered">
    <item name="IMP-001">[technique] — Stage [N] — Impact: [High/Medium/Low] — Sketch: [brief implementation approach]</item>
    <item name="IMP-002">[technique] — Stage [N] — Impact: [High/Medium/Low] — Sketch: [brief implementation approach]</item>
  </list>

  <paragraph>[If none: "No internal improvement opportunities identified."]</paragraph>
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
4. Community Discovery IDs MUST use format: `COM-NNN`
5. Internal Improvement IDs MUST use format: `IMP-NNN`
6. Confidence values MUST be one of: `High`, `Medium`, `Low`
7. Recency/Freshness values MUST be one of: `Fresh`, `Current`, `Dated`, `Outdated`
8. Options Comparison table MUST have at least 3 options with numeric scores (1-5)
9. Every claim MUST cite at least one SRC-NNN reference
10. Contradictions section MUST be present (even if "No contradictions found")
11. Momentum scores MUST be numeric 0.0-1.0 (two decimal places)
12. Innovation Potential scores MUST be numeric 0.0-1.0 (two decimal places)
13. Optional sections (Community Discoveries, New Technologies, AI Workflow Patterns, Internal Improvement Suggestions) MUST be omitted entirely when no relevant findings exist — do not include empty sections
