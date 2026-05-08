---
name: usage-report
description: View skill and agent usage statistics for the super-dev plugin
---

<purpose>Read `${PLUGIN_DATA}/global/stats.json` and `${PLUGIN_DATA}/global/usage.log` to display total invocations, top skills, top agents, and recent activity. Resolve `PLUGIN_DATA` from `${CLAUDE_PLUGIN_DATA}` (Claude) or `${extensionPath}/.plugin-data` (Gemini).</purpose>

<usage>/super-dev:usage-report</usage>

<output name="What It Displays">
  Total invocations: How many times skills and agents have been used. Top skills: Most frequently used, sorted by count. Top agents: Most frequently used, sorted by count. Recent activity: Last 10 invocations from usage.log.
</output>

<constraints>
  <constraint>Usage data stored in `${PLUGIN_DATA}/global/` (resolved per platform) — persists across sessions and projects</constraint>
  <constraint>Stats updated automatically via PreToolUse hook</constraint>
  <constraint>No sensitive data collected — only tool names and timestamps</constraint>
</constraints>
